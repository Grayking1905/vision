import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../stores/appStore';
import * as api from '../services/api';
import { WS_URL } from '../constants/urls';
import ModelCard from '../components/pretrained/ModelCard';
import LayerInspector from '../components/pretrained/LayerInspector';
import FineTuneConfig from '../components/pretrained/FineTuneConfig';

export default function PretrainedPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  // Store
  const { 
    pretrainedCatalog, setPretrainedCatalog, 
    loadedModels, setLoadedModels,
    selectedPretrained, setSelectedPretrained,
    fineTuneConfig, setFineTuneConfig,
    isFineTuning, setIsFineTuning,
    fineTuneMetrics, addFineTuneMetric, clearFineTune,
    addToast 
  } = useAppStore();

  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('hub'); // hub | inspect | sandbox
  const [loadingMap, setLoadingMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [sizeFilter, setSizeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Initial Load
  useEffect(() => {
    api.getPretrainedCatalog().then(res => setPretrainedCatalog(res.models)).catch(console.error);
    api.getLoadedModels(projectId).then(res => setLoadedModels(res.data)).catch(console.error);
    api.getFiles(projectId).then(res => setFiles(res.data)).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Socket setup for training metrics
  useEffect(() => {
    const socket = io(`${WS_URL}/dl`, { transports: ['websocket'] });
    
    socket.on('finetune_update', (data) => {
      if (data.event === 'ft_train_begin') {
        clearFineTune();
        setIsFineTuning(true);
        addToast(`Started fine-tuning ${data.model}`);
      } else if (data.event === 'ft_epoch_end') {
        addFineTuneMetric(data);
      } else if (data.event === 'ft_train_complete') {
        setIsFineTuning(false);
        addToast(`Fine-tuning complete for ${data.model}!`);
        api.getLoadedModels(projectId).then(res => setLoadedModels(res.data)).catch(console.error);
      } else if (data.event === 'ft_error') {
        setIsFineTuning(false);
        addToast(data.message, 'error');
      }
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleLoadModel = async (key) => {
    setLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.loadPretrained({ base_model_key: key, include_top: false, project_id: projectId });
      addToast(res.message);
      const list = await api.getLoadedModels(projectId);
      setLoadedModels(list.data);
      
      const newModel = list.data.find(m => m.base_model_key === key);
      if (newModel) {
        setSelectedPretrained(newModel);
        setActiveTab('inspect');
        loadSummary(newModel.id);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load model', 'error');
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const loadSummary = async (id) => {
    try {
      const res = await api.getPretrainedSummary(id);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load layer summary', 'error');
    }
  };

  const handleSelectLoaded = (model) => {
    setSelectedPretrained(model);
    loadSummary(model.id);
    setActiveTab('inspect');
  };

  const handleReverseEngineer = async () => {
    if (!selectedPretrained) return;
    try {
      addToast('Decomposing model graph...', 'success');
      const res = await api.reverseEngineer(selectedPretrained.id);
      // Pass the graph to Canvas via localStorage or state
      localStorage.setItem('vision-re-graph', JSON.stringify({
        nodes: res.nodes,
        edges: res.edges,
        modelName: selectedPretrained.display_name
      }));
      navigate(`/workspace/${projectId}/canvas?re=true`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reverse engineer', 'error');
    }
  };

  const handleSaveConfig = async (config) => {
    try {
      const res = await api.saveFineTuneConfig({ ...config, pretrained_id: selectedPretrained.id, project_id: projectId });
      addToast(res.message);
      setFineTuneConfig(config);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save config', 'error');
    }
  };

  const handleRunFineTune = async () => {
    try {
      await api.runFineTune(selectedPretrained.id, projectId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to start fine-tuning', 'error');
    }
  };

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return pretrainedCatalog.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchSize = sizeFilter === 'all' || m.size === sizeFilter;
      return matchSearch && matchSize;
    });
  }, [pretrainedCatalog, search, sizeFilter]);

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
          Pretrained Models
        </h1>
        <p className="text-[var(--text-muted)] max-w-2xl">
          Load base models from the catalog, reverse engineer their architectures into the visual canvas, or fine-tune them on your custom datasets.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[rgba(255,255,255,0.1)] pb-px">
        {['hub', 'inspect', 'sandbox'].map(t => (
          <button
            key={t}
            className={`px-4 py-2 capitalize font-medium transition-colors border-b-2 ${
              activeTab === t 
                ? 'border-[var(--accent-violet)] text-[var(--accent-violet)]' 
                : 'border-transparent text-[var(--text-muted)] hover:text-white'
            }`}
            onClick={() => setActiveTab(t)}
            disabled={t !== 'hub' && !selectedPretrained}
          >
            {t === 'hub' ? 'Model Hub' : t === 'inspect' ? 'Reverse Engineer' : 'Sandbox Fine-Tuning'}
          </button>
        ))}
      </div>

      {/* Tab: Hub */}
      {activeTab === 'hub' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
            <input 
              type="text" 
              placeholder="Search models..." 
              className="input w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              {['all', 'small', 'medium', 'large'].map(s => (
                <button
                  key={s}
                  className={`px-3 py-1 rounded-full text-sm capitalize ${sizeFilter === s ? 'bg-[var(--accent-violet)] text-white' : 'bg-[rgba(255,255,255,0.1)] text-[var(--text-muted)]'}`}
                  onClick={() => setSizeFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCatalog.map(m => {
              const isLoaded = loadedModels.some(lm => lm.base_model_key === m.key);
              return (
                <div key={m.key} className="relative">
                  {isLoaded && (
                    <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                      Loaded
                    </div>
                  )}
                  <ModelCard 
                    model={m} 
                    onLoad={() => isLoaded ? handleSelectLoaded(loadedModels.find(lm => lm.base_model_key === m.key)) : handleLoadModel(m.key)} 
                    loading={loadingMap[m.key]} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Inspect / Reverse Engineer */}
      {activeTab === 'inspect' && selectedPretrained && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 flex justify-between items-center bg-gradient-to-r from-[rgba(139,92,246,0.1)] to-transparent">
            <div>
              <h2 className="text-2xl font-bold">{selectedPretrained.display_name}</h2>
              <p className="text-[var(--text-muted)]">Base Model: {selectedPretrained.base_model_key}</p>
            </div>
            <button className="btn btn-primary flex gap-2" onClick={handleReverseEngineer}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              Reverse Engineer to Canvas
            </button>
          </div>
          
          <LayerInspector summary={summary} />
        </div>
      )}

      {/* Tab: Sandbox Fine-Tuning */}
      {activeTab === 'sandbox' && selectedPretrained && (
        <div className="flex flex-col gap-8">
          <FineTuneConfig 
            model={selectedPretrained} 
            files={files} 
            config={fineTuneConfig} 
            onChange={setFineTuneConfig}
            onSave={handleSaveConfig}
            isSaving={false}
          />

          <div className="flex gap-4 items-center">
            <button 
              className="btn btn-primary flex-1 py-4 text-lg justify-center relative overflow-hidden"
              onClick={handleRunFineTune}
              disabled={isFineTuning}
            >
              {isFineTuning ? (
                <>
                  <div className="spinner w-5 h-5 mr-3" />
                  Training in progress...
                </>
              ) : 'Start Fine-Tuning'}
              {isFineTuning && <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full animate-pulse" />}
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => api.generateFineTuneCode(selectedPretrained.id, projectId)}
            >
              ↓ Download Python Code
            </button>
          </div>

          {/* Live Charts */}
          {fineTuneMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-card p-6 h-80">
                <h3 className="font-semibold mb-4 text-[var(--accent-violet)]">Loss Curve</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fineTuneMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="loss" stroke="#8b5cf6" strokeWidth={3} dot={false} isAnimationActive={true} />
                    <Line type="monotone" dataKey="val_loss" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card p-6 h-80">
                <h3 className="font-semibold mb-4 text-[var(--accent-cyan)]">Accuracy Curve</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fineTuneMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 1]} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#06b6d4" strokeWidth={3} dot={false} isAnimationActive={true} />
                    <Line type="monotone" dataKey="val_accuracy" stroke="#67e8f9" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
