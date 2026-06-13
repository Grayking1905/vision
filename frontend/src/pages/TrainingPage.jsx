import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity, Play, Download, Settings, Zap } from 'lucide-react';
import { getModelList, getFiles, updateTrainingConfig, runModel, downloadCode } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { WS_URL } from '../constants/urls';

const OPTIMIZERS = ['adam', 'sgd', 'rmsprop', 'adagrad', 'adamax', 'nadam'];
const METRICS = ['accuracy', 'mse', 'mae', 'mape'];
const PROBLEM_TYPES = [
  { id: 1, label: 'Classification (Integer Labels)' },
  { id: 2, label: 'Regression' },
  { id: 3, label: 'Multi-class Classification' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(16,16,31,0.95)',
      border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.625rem 0.875rem',
      fontSize: '0.8rem',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Epoch {label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{ color: entry.color, margin: '0.1rem 0' }}>
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function TrainingPage() {
  const { projectId } = useParams();
  const { addToast, trainingMetrics, isTraining, setIsTraining, addTrainingMetric, clearTraining } = useAppStore();

  const [models, setModels] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [config, setConfig] = useState({
    file_id: '',
    target_field: '',
    training_split: 80,
    problem_type_id: 1,
    optimizer: 'adam',
    metric: 'accuracy',
    epochs: 10,
    batch_size: 32,
  });
  const [configuring, setConfiguring] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [columns, setColumns] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    getModelList(projectId).then(r => {
      const list = r.data || [];
      setModels(list);
      if (list.length > 0) setSelectedModel(list[0].model_name);
    }).catch(() => {});
    getFiles(projectId).then(r => {
      const csvFiles = (r.data || []).filter(f => f.file_type === 'csv');
      setFiles(csvFiles);
      if (csvFiles.length > 0) setConfig(c => ({ ...c, file_id: csvFiles[0].file_id }));
    }).catch(() => {});
  }, [projectId]);

  // Update columns when file selected
  useEffect(() => {
    const file = files.find(f => f.file_id === config.file_id);
    setColumns(file?.fields || []);
    setConfig(c => ({ ...c, target_field: '' }));
  }, [config.file_id, files]);

  // Connect Socket.IO
  useEffect(() => {
    const socket = io(WS_URL, { path: '/socket.io', transports: ['websocket'], namespace: '/training' });
    socketRef.current = socket;

    socket.on('training_update', (data) => {
      if (data.event === 'train_begin') {
        setIsTraining(true);
      } else if (data.event === 'epoch_end') {
        addTrainingMetric({
          epoch: data.epoch,
          loss: data.loss,
          accuracy: data.accuracy,
          val_loss: data.val_loss,
          val_accuracy: data.val_accuracy,
        });
      } else if (data.event === 'train_complete') {
        setIsTraining(false);
        setRunning(false);
        addToast('Training complete! 🎉');
      } else if (data.event === 'error') {
        setIsTraining(false);
        setRunning(false);
        addToast(data.message || 'Training error', 'error');
      }
    });

    return () => socket.disconnect();
  }, []);

  const handleSaveConfig = async () => {
    if (!selectedModel) { addToast('Select a model first', 'error'); return; }
    if (!config.file_id) { addToast('Select a dataset', 'error'); return; }
    setConfiguring(true);
    try {
      await updateTrainingConfig({ ...config, model_name: selectedModel, project_id: projectId });
      setConfigSaved(true);
      addToast('Training configuration saved');
    } catch {
      addToast('Failed to save config', 'error');
    } finally {
      setConfiguring(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedModel) { addToast('Select a model first', 'error'); return; }
    clearTraining();
    setRunning(true);
    setIsTraining(true);
    try {
      await runModel(selectedModel, projectId);
    } catch (err) {
      addToast(err?.response?.data?.message || 'Training failed to start', 'error');
      setRunning(false);
      setIsTraining(false);
    }
  };

  const hasMetrics = trainingMetrics.length > 0;
  const latest = hasMetrics ? trainingMetrics[trainingMetrics.length - 1] : null;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Activity size={20} style={{ color: 'var(--accent-emerald)' }} />
          <h2>Training</h2>
          {isTraining && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.5rem' }}>
              <div className="pulse-dot" />
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Training...</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Configure and launch model training with live metrics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Config Panel */}
        <div className="glass-card-elevated" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={16} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '0.9375rem' }}>Configuration</h3>
          </div>

          <div>
            <label className="label">Model</label>
            <select className="select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
              {models.length === 0 && <option value="">No saved models</option>}
              {models.map(m => <option key={m.model_name} value={m.model_name}>{m.model_name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Dataset</label>
            <select className="select" value={config.file_id} onChange={e => setConfig(c => ({ ...c, file_id: e.target.value }))}>
              {files.length === 0 && <option value="">No CSV files uploaded</option>}
              {files.map(f => <option key={f.file_id} value={f.file_id}>{f.file_name}.{f.file_type}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Target Column</label>
            <select className="select" value={config.target_field} onChange={e => setConfig(c => ({ ...c, target_field: e.target.value }))}>
              <option value="">Select target...</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Problem Type</label>
            <select className="select" value={config.problem_type_id} onChange={e => setConfig(c => ({ ...c, problem_type_id: parseInt(e.target.value) }))}>
              {PROBLEM_TYPES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Optimizer</label>
              <select className="select" value={config.optimizer} onChange={e => setConfig(c => ({ ...c, optimizer: e.target.value }))}>
                {OPTIMIZERS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Metric</label>
              <select className="select" value={config.metric} onChange={e => setConfig(c => ({ ...c, metric: e.target.value }))}>
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Epochs</label>
              <input className="input" type="number" min={1} max={1000} value={config.epochs} onChange={e => setConfig(c => ({ ...c, epochs: parseInt(e.target.value) || 10 }))} />
            </div>
            <div>
              <label className="label">Batch Size</label>
              <input className="input" type="number" min={1} value={config.batch_size} onChange={e => setConfig(c => ({ ...c, batch_size: parseInt(e.target.value) || 32 }))} />
            </div>
          </div>

          <div>
            <label className="label">Training Split: {config.training_split}%</label>
            <input type="range" min={50} max={95} step={5} value={config.training_split} onChange={e => setConfig(c => ({ ...c, training_split: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--accent-violet-light)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>Train: {config.training_split}%</span>
              <span>Val: {100 - config.training_split}%</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleSaveConfig} disabled={configuring}>
              <Settings size={14} />
              {configuring ? 'Saving...' : 'Save Config'}
            </button>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleStartTraining}
              disabled={running || isTraining || !selectedModel}
            >
              {running ? (
                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Training...</>
              ) : (
                <><Zap size={14} /> Start Training</>
              )}
            </button>
            {selectedModel && (
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => downloadCode(selectedModel, projectId)}>
                <Download size={13} /> Download Code
              </button>
            )}
          </div>
        </div>

        {/* Charts Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Live metrics summary */}
          {latest && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Loss', value: latest.loss?.toFixed(4), color: '#f43f5e' },
                { label: 'Accuracy', value: latest.accuracy !== null ? (latest.accuracy * 100).toFixed(1) + '%' : '—', color: '#a78bfa' },
                { label: 'Val Loss', value: latest.val_loss?.toFixed(4) ?? '—', color: '#f59e0b' },
                { label: 'Val Acc', value: latest.val_accuracy !== null && latest.val_accuracy !== undefined ? (latest.val_accuracy * 100).toFixed(1) + '%' : '—', color: '#22d3ee' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-card" style={{ padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
                  <p style={{ fontSize: '1.375rem', fontWeight: 700, color }}>{value}</p>
                  {isTraining && <div style={{ width: '100%', height: 2, background: color, borderRadius: 1, marginTop: '0.5rem', opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }} />}
                </div>
              ))}
            </div>
          )}

          {/* Loss chart */}
          <div className="glass-card-elevated" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Training Loss</h3>
            {hasMetrics ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trainingMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 11 } }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                  <Line type="monotone" dataKey="loss" stroke="#f43f5e" dot={false} strokeWidth={2} name="Train Loss" isAnimationActive />
                  <Line type="monotone" dataKey="val_loss" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Val Loss" isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Loss curve will appear here during training</p>
              </div>
            )}
          </div>

          {/* Accuracy chart */}
          <div className="glass-card-elevated" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Accuracy</h3>
            {hasMetrics ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trainingMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#a78bfa" dot={false} strokeWidth={2} name="Train Acc" isAnimationActive />
                  <Line type="monotone" dataKey="val_accuracy" stroke="#22d3ee" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Val Acc" isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Accuracy curve will appear here during training</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
