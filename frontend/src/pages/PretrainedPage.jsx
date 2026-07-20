import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Box, Layers, Cpu, Zap, Sparkles, Play, ArrowRight } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import * as api from '../services/api';
import { WS_URL } from '../constants/urls';
import ModelCard from '../components/pretrained/ModelCard';
import ModelDetailDrawer from '../components/pretrained/ModelDetailDrawer';
import LayerInspector from '../components/pretrained/LayerInspector';
import FineTuneConfig from '../components/pretrained/FineTuneConfig';
import './PretrainedPage.css';

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
  const [activeTab, setActiveTab] = useState('hub');
  const [loadingMap, setLoadingMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [sizeFilter, setSizeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detailModel, setDetailModel] = useState(null);

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
        setDetailModel(null);
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
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                          m.description.toLowerCase().includes(search.toLowerCase());
      const matchSize = sizeFilter === 'all' || m.size === sizeFilter;
      return matchSearch && matchSize;
    });
  }, [pretrainedCatalog, search, sizeFilter]);

  const sizeCount = useMemo(() => {
    const counts = { all: pretrainedCatalog.length, small: 0, medium: 0, large: 0 };
    pretrainedCatalog.forEach(m => { if (counts[m.size] !== undefined) counts[m.size]++; });
    return counts;
  }, [pretrainedCatalog]);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, padding: '2rem', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      
      {/* Hero Header */}
      <div className="modelhub-hero">
        <div className="modelhub-hero-grid" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Box size={24} style={{ color: 'var(--accent-violet-light)' }} />
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              <span className="gradient-text">Model Hub</span>
            </h1>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, maxWidth: 600 }}>
            Load pretrained models, explore their architectures in visual canvas, or fine-tune them on your custom datasets.
          </p>

          <div className="modelhub-stats">
            <div className="modelhub-stat">
              <div className="modelhub-stat-value">{pretrainedCatalog.length}</div>
              <div className="modelhub-stat-label">Models</div>
            </div>
            <div className="modelhub-stat">
              <div className="modelhub-stat-value">{loadedModels.length}</div>
              <div className="modelhub-stat-label">Loaded</div>
            </div>
            <div className="modelhub-stat">
              <div className="modelhub-stat-value">ImageNet</div>
              <div className="modelhub-stat-label">Pre-trained</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loaded models strip */}
      {loadedModels.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={12} /> Active Models
          </div>
          <div className="loaded-models-strip">
            {loadedModels.map(m => (
              <button
                key={m.id}
                className={`loaded-model-chip ${selectedPretrained?.id === m.id ? 'active' : ''}`}
                onClick={() => handleSelectLoaded(m)}
              >
                <Box size={12} />
                {m.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="modelhub-tabs">
        {[
          { key: 'hub', label: 'Model Hub', icon: Layers },
          { key: 'inspect', label: 'Reverse Engineer', icon: Cpu },
          { key: 'sandbox', label: 'Sandbox Fine-Tuning', icon: Zap },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`modelhub-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
            disabled={key !== 'hub' && !selectedPretrained}
          >
            <Icon size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Hub ═══ */}
      {activeTab === 'hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters bar */}
          <div className="modelhub-filters">
            <div className="modelhub-search">
              <Search size={14} className="modelhub-search-icon" />
              <input
                className="input"
                placeholder="Search models by name or description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="modelhub-filter-chips">
              {['all', 'small', 'medium', 'large'].map(s => (
                <button
                  key={s}
                  className={`modelhub-chip ${sizeFilter === s ? 'active' : ''}`}
                  onClick={() => setSizeFilter(s)}
                >
                  {s} ({sizeCount[s]})
                </button>
              ))}
            </div>
          </div>

          {/* Cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}>
            {filteredCatalog.map((m, idx) => {
              const isLoaded = loadedModels.some(lm => lm.base_model_key === m.key);
              return (
                <div key={m.key} style={{ animationDelay: `${idx * 0.05}s` }} className="animate-in">
                  <ModelCard
                    model={m}
                    onLoad={() => isLoaded
                      ? handleSelectLoaded(loadedModels.find(lm => lm.base_model_key === m.key))
                      : handleLoadModel(m.key)
                    }
                    onDetail={() => setDetailModel(m)}
                    loading={loadingMap[m.key]}
                    isLoaded={isLoaded}
                  />
                </div>
              );
            })}
          </div>

          {filteredCatalog.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.9rem' }}>No models match your search.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Inspect / Reverse Engineer ═══ */}
      {activeTab === 'inspect' && selectedPretrained && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 100%)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{selectedPretrained.display_name}</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                Base Model: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan-light)' }}>{selectedPretrained.base_model_key}</span>
              </p>
            </div>
            <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={handleReverseEngineer}>
              <Play size={16} />
              Reverse Engineer to Canvas
              <ArrowRight size={14} />
            </button>
          </div>
          
          <LayerInspector summary={summary} />
        </div>
      )}

      {/* ═══ Tab: Sandbox Fine-Tuning ═══ */}
      {activeTab === 'sandbox' && selectedPretrained && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <FineTuneConfig 
            model={selectedPretrained} 
            files={files} 
            config={fineTuneConfig} 
            onChange={setFineTuneConfig}
            onSave={handleSaveConfig}
            isSaving={false}
          />

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              className="btn btn-primary"
              style={{ flex: 1, padding: '1rem', fontSize: '1rem', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
              onClick={handleRunFineTune}
              disabled={isFineTuning}
            >
              {isFineTuning ? (
                <>
                  <div className="spinner" style={{ width: 20, height: 20, marginRight: '0.75rem' }} />
                  Training in progress...
                </>
              ) : (
                <>
                  <Zap size={18} style={{ marginRight: '0.5rem' }} />
                  Start Fine-Tuning
                </>
              )}
              {isFineTuning && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: '100%', background: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ height: '100%', background: 'white', animation: 'shimmer 2s ease infinite', width: '30%', borderRadius: 2 }} />
                </div>
              )}
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => api.generateFineTuneCode(selectedPretrained.id, projectId)}
            >
              ↓ Download Code
            </button>
          </div>

          {/* Live Charts */}
          {fineTuneMetrics.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', height: 320 }}>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-violet-light)', fontSize: '0.9rem' }}>
                  <Layers size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  Loss Curve
                </h3>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={fineTuneMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="loss" stroke="#8b5cf6" strokeWidth={3} dot={false} isAnimationActive={true} />
                    <Line type="monotone" dataKey="val_loss" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem', height: 320 }}>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-cyan-light)', fontSize: '0.9rem' }}>
                  <Zap size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  Accuracy Curve
                </h3>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={fineTuneMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.3)" domain={[0, 1]} fontSize={11} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
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

      {/* Detail Drawer */}
      {detailModel && (
        <ModelDetailDrawer
          model={detailModel}
          onClose={() => setDetailModel(null)}
          onLoad={(key) => {
            const isLoaded = loadedModels.some(lm => lm.base_model_key === key);
            if (isLoaded) {
              handleSelectLoaded(loadedModels.find(lm => lm.base_model_key === key));
            } else {
              handleLoadModel(key);
            }
          }}
          loading={loadingMap[detailModel.key]}
          isLoaded={loadedModels.some(lm => lm.base_model_key === detailModel.key)}
        />
      )}
    </div>
  );
}
