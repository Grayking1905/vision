import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Activity, Play, Download, Settings, Zap, CheckCircle2,
  FolderDown, Sparkles, Sliders, HardDrive, ArrowRight, RefreshCw, FileCode,
  TrendingDown, TrendingUp
} from 'lucide-react';
import {
  getModelList, getFiles, updateTrainingConfig, runModel,
  downloadCode, getTrainedModels, exportTrainedToPretrained
} from '../services/api';
import { useAppStore } from '../stores/appStore';
import { WS_URL, downloadTrainedModel } from '../constants/urls';

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
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Epoch {label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{ color: entry.color, margin: '0.15rem 0' }}>
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function TrainingPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    addToast,
    trainingMetrics,
    isTraining,
    setIsTraining,
    addTrainingMetric,
    setTrainingMetrics,
    clearTraining
  } = useAppStore();

  const [models, setModels] = useState([]);
  const [trainedModels, setTrainedModels] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [config, setConfig] = useState({
    file_id: '',
    target_field: '',
    training_split: 80,
    problem_type_id: 1,
    optimizer: 'adam',
    metric: 'accuracy',
    epochs: 15,
    batch_size: 32,
  });
  const [configuring, setConfiguring] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(15);
  const [columns, setColumns] = useState([]);
  const [savedModelResult, setSavedModelResult] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const socketRef = useRef(null);
  const socketNsRef = useRef(null);

  const fetchTrainedModelsList = useCallback(() => {
    getTrainedModels(projectId)
      .then(res => setTrainedModels(res.data || []))
      .catch(() => {});
  }, [projectId]);

  const fetchModelsAndFiles = useCallback(() => {
    getModelList(projectId).then(r => {
      const list = r.data || [];
      setModels(list);
      if (list.length > 0 && !selectedModel) {
        setSelectedModel(list[0].model_name);
      }
    }).catch(() => {});

    getFiles(projectId).then(r => {
      const validFiles = (r.data || []).filter(f => f.file_type === 'csv' || f.file_type === 'zip');
      setFiles(validFiles);
      if (validFiles.length > 0 && !config.file_id) {
        const first = validFiles[0];
        setConfig(c => ({
          ...c,
          file_id: first.file_id,
          target_field: first.file_type === 'zip' ? 'image_class' : (first.fields?.length > 0 ? first.fields[first.fields.length - 1] : '')
        }));
      }
    }).catch(() => {});
  }, [projectId, selectedModel, config.file_id]);

  useEffect(() => {
    fetchModelsAndFiles();
    fetchTrainedModelsList();
  }, [fetchModelsAndFiles, fetchTrainedModelsList]);

  // Update columns when file selected
  useEffect(() => {
    const file = files.find(f => f.file_id === config.file_id);
    if (file?.file_type === 'zip') {
      setColumns(['image_class']);
      setConfig(c => ({
        ...c,
        target_field: 'image_class',
        problem_type_id: 1, // Classification
      }));
    } else {
      const cols = file?.fields || [];
      setColumns(cols);
      if (cols.length > 0 && (!config.target_field || config.target_field === 'image_class')) {
        setConfig(c => ({ ...c, target_field: cols[cols.length - 1] }));
      }
    }
  }, [config.file_id, files]);

  // Connect Socket.IO for live training metrics
  useEffect(() => {
    const handleUpdate = (data) => {
      if (data.event === 'train_begin') {
        setIsTraining(true);
        setRunning(true);
        if (data.total_epochs) setTotalEpochs(data.total_epochs);
      } else if (data.event === 'epoch_begin') {
        setCurrentEpoch(data.epoch);
        if (data.total_epochs) setTotalEpochs(data.total_epochs);
      } else if (data.event === 'epoch_end') {
        setCurrentEpoch(data.epoch);
        if (data.total_epochs) setTotalEpochs(data.total_epochs);
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
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          setTrainingMetrics(data.history);
        }
        setSavedModelResult(data);
        fetchTrainedModelsList();
        fetchModelsAndFiles();
        addToast(`Model "${data.model_name || 'Neural Net'}" trained and saved successfully! 🎉`);
      } else if (data.event === 'error') {
        setIsTraining(false);
        setRunning(false);
        addToast(data.message || 'Training error occurred', 'error');
      }
    };

    // Connect to both /training and root namespaces for universal reception
    const socketNs = io(`${WS_URL}/training`, { transports: ['websocket', 'polling'] });
    const socketRoot = io(WS_URL, { transports: ['websocket', 'polling'] });

    socketNsRef.current = socketNs;
    socketRef.current = socketRoot;

    socketNs.on('training_update', handleUpdate);
    socketRoot.on('training_update', handleUpdate);

    return () => {
      socketNs.disconnect();
      socketRoot.disconnect();
    };
  }, [addToast, addTrainingMetric, setTrainingMetrics, setIsTraining, fetchTrainedModelsList, fetchModelsAndFiles]);

  const handleSaveConfig = async () => {
    if (!selectedModel) { addToast('Select a model first', 'error'); return; }
    if (!config.file_id) { addToast('Select a dataset', 'error'); return; }
    setConfiguring(true);
    try {
      await updateTrainingConfig({ ...config, model_name: selectedModel, project_id: projectId });
      addToast('Training configuration saved');
    } catch {
      addToast('Failed to save config', 'error');
    } finally {
      setConfiguring(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedModel) {
      addToast('Select or create a model in Canvas first', 'error');
      return;
    }
    clearTraining();
    setSavedModelResult(null);
    setRunning(true);
    setIsTraining(true);
    setCurrentEpoch(0);
    setTotalEpochs(config.epochs || 15);

    try {
      const res = await runModel(selectedModel, projectId, {
        file_id: config.file_id,
        target_field: config.target_field,
        epochs: config.epochs,
        batch_size: config.batch_size,
        optimizer: config.optimizer,
        metric: config.metric,
        training_split: config.training_split,
        problem_type_id: config.problem_type_id,
      });

      if (res?.data) {
        setSavedModelResult(res.data);
        if (res.data.history && Array.isArray(res.data.history) && res.data.history.length > 0) {
          setTrainingMetrics(res.data.history);
        }
      }
      fetchTrainedModelsList();
      fetchModelsAndFiles();
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Training failed to start', 'error');
    } finally {
      setRunning(false);
      setIsTraining(false);
    }
  };

  const handleExportToPretrained = async (modelName) => {
    setExportingId(modelName);
    try {
      const res = await exportTrainedToPretrained(modelName);
      addToast(res.message || 'Model exported to Pretrained catalogue!');
      navigate(`/workspace/${projectId}/pretrained`);
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to export model', 'error');
    } finally {
      setExportingId(null);
    }
  };

  const hasMetrics = trainingMetrics && trainingMetrics.length > 0;
  const latest = hasMetrics ? trainingMetrics[trainingMetrics.length - 1] : null;
  const progressPct = totalEpochs > 0 ? Math.min(100, Math.round((currentEpoch / totalEpochs) * 100)) : 0;

  // Selected model details if already trained
  const selectedModelObj = models.find(m => m.model_name === selectedModel);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Activity size={22} style={{ color: 'var(--accent-emerald)' }} />
            <h2 style={{ color: 'var(--text-primary)' }}>Live Model Training &amp; Persistence</h2>
            {isTraining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.5rem', background: 'rgba(52, 211, 153, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                <div className="pulse-dot" style={{ background: '#34d399' }} />
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                  Training Epoch {currentEpoch}/{totalEpochs} ({progressPct}%)
                </span>
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Train your neural models locally with TensorFlow, observe live telemetry curves, and auto-save models into <code>data/trained_models/</code>.
          </p>
        </div>
      </div>

      {/* Main Grid: Config Panel & Telemetry Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Config Panel */}
        <div className="glass-card-elevated" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={16} style={{ color: 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Training Hyperparameters</h3>
            </div>
            {selectedModelObj?.is_trained && (
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                ✓ Trained
              </span>
            )}
          </div>

          <div>
            <label className="label">Target Neural Model</label>
            <select
              className="select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
            >
              {models.length === 0 && <option value="">No models available (Create one in Canvas)</option>}
              {models.map(m => (
                <option key={m.model_name} value={m.model_name}>
                  {m.model_name} {m.is_trained ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Training Dataset</label>
            <select
              className="select"
              value={config.file_id}
              onChange={e => setConfig(c => ({ ...c, file_id: e.target.value }))}
            >
              {files.length === 0 && <option value="">No datasets loaded (Import from Dataset page)</option>}
              {files.map(f => (
                <option key={f.file_id} value={f.file_id}>
                  {f.file_name}.{f.file_type} {f.file_type === 'zip' ? '🖼️ (Image Archive)' : `(${f.row_count?.toLocaleString() || '—'} rows)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Target Column (Label)</label>
            <select
              className="select"
              value={config.target_field}
              onChange={e => setConfig(c => ({ ...c, target_field: e.target.value }))}
            >
              {columns.map(col => (
                <option key={col} value={col}>
                  {col === 'image_class' ? '🖼️ Automatic (Image Subfolder Classes)' : col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Problem Type</label>
            <select
              className="select"
              value={config.problem_type_id}
              onChange={e => setConfig(c => ({ ...c, problem_type_id: parseInt(e.target.value) }))}
            >
              {PROBLEM_TYPES.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Optimizer</label>
              <select
                className="select"
                value={config.optimizer}
                onChange={e => setConfig(c => ({ ...c, optimizer: e.target.value }))}
              >
                {OPTIMIZERS.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Metric</label>
              <select
                className="select"
                value={config.metric}
                onChange={e => setConfig(c => ({ ...c, metric: e.target.value }))}
              >
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Epochs</label>
              <input
                className="input"
                type="number"
                min={1}
                max={500}
                value={config.epochs}
                onChange={e => setConfig(c => ({ ...c, epochs: parseInt(e.target.value) || 15 }))}
              />
            </div>
            <div>
              <label className="label">Batch Size</label>
              <input
                className="input"
                type="number"
                min={1}
                max={512}
                value={config.batch_size}
                onChange={e => setConfig(c => ({ ...c, batch_size: parseInt(e.target.value) || 32 }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Training Split: {config.training_split}%</label>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={config.training_split}
              onChange={e => setConfig(c => ({ ...c, training_split: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent-violet-light)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>Train: {config.training_split}%</span>
              <span>Validation: {100 - config.training_split}%</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}
              onClick={handleStartTraining}
              disabled={running || isTraining || !selectedModel || files.length === 0}
            >
              {running ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Training in Progress...
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Start Local Training
                </>
              )}
            </button>

            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%' }}
              onClick={handleSaveConfig}
              disabled={configuring || !selectedModel}
            >
              <Settings size={13} />
              {configuring ? 'Saving...' : 'Save Configuration Only'}
            </button>

            {selectedModel && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%' }}
                onClick={() => downloadCode(selectedModel, projectId)}
              >
                <FileCode size={13} />
                Download Python Code (.py)
              </button>
            )}
          </div>
        </div>

        {/* Right Charts & Progress Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Active Training Progress Bar */}
          {isTraining && (
            <div className="glass-card" style={{ padding: '1rem 1.25rem', border: '1px solid rgba(124,58,237,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Training Progress: Epoch {currentEpoch} / {totalEpochs}
                </span>
                <span style={{ color: 'var(--accent-violet-light)', fontWeight: 700 }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #7c3aed, #06b6d4, #10b981)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Success Banner when model saved locally */}
          {(savedModelResult || selectedModelObj?.is_trained) && (
            <div
              className="glass-card-elevated"
              style={{
                padding: '1.25rem',
                border: '1px solid rgba(16,185,129,0.35)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Trained Model Saved Locally!
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Saved at: <code style={{ color: 'var(--accent-cyan)' }}>data/trained_models/{selectedModel}_trained.keras</code>
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href={downloadTrainedModel(selectedModel, 'keras')}
                    download
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.75rem', gap: '0.35rem', textDecoration: 'none' }}
                  >
                    <Download size={13} />
                    Download Model (.keras)
                  </a>
                  <a
                    href={downloadTrainedModel(selectedModel, 'weights')}
                    download
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: '0.75rem', gap: '0.35rem', textDecoration: 'none' }}
                  >
                    <HardDrive size={13} />
                    Weights (.h5)
                  </a>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleExportToPretrained(selectedModel)}
                    disabled={exportingId === selectedModel}
                    style={{ fontSize: '0.75rem', gap: '0.35rem' }}
                  >
                    <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
                    {exportingId === selectedModel ? 'Exporting...' : 'Fine-Tune in Pretrained'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Metrics Summary Cards */}
          {latest && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Train Loss', value: latest.loss?.toFixed(4), color: '#f43f5e' },
                {
                  label: 'Train Accuracy',
                  value: latest.accuracy !== null && latest.accuracy !== undefined
                    ? (latest.accuracy * 100).toFixed(1) + '%'
                    : '—',
                  color: '#a78bfa',
                },
                { label: 'Val Loss', value: latest.val_loss?.toFixed(4) ?? '—', color: '#f59e0b' },
                {
                  label: 'Val Accuracy',
                  value: latest.val_accuracy !== null && latest.val_accuracy !== undefined
                    ? (latest.val_accuracy * 100).toFixed(1) + '%'
                    : '—',
                  color: '#22d3ee',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-card" style={{ padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</p>
                  {isTraining && (
                    <div style={{ width: '100%', height: 2, background: color, borderRadius: 1, marginTop: '0.5rem', opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loss Chart */}
          <div
            className="glass-card-elevated"
            style={{
              padding: '1.25rem',
              border: isTraining ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingDown size={16} style={{ color: '#f43f5e' }} />
                <h3 style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  Training &amp; Validation Loss
                </h3>
              </div>
              {hasMetrics && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {trainingMetrics.length} Epochs Recorded
                </span>
              )}
            </div>

            {hasMetrics ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trainingMetrics} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 11 } }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                  <Line type="monotone" dataKey="loss" stroke="#f43f5e" dot={{ r: 3 }} strokeWidth={2.5} name="Train Loss" isAnimationActive={false} />
                  <Line type="monotone" dataKey="val_loss" stroke="#f59e0b" dot={{ r: 3 }} strokeWidth={2} strokeDasharray="5 5" name="Val Loss" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Loss curve will stream live during training</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Click &quot;Start Local Training&quot; to begin</p>
              </div>
            )}
          </div>

          {/* Accuracy Chart */}
          <div
            className="glass-card-elevated"
            style={{
              padding: '1.25rem',
              border: isTraining ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--border-subtle)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} style={{ color: '#22d3ee' }} />
                <h3 style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  Accuracy Trajectory
                </h3>
              </div>
              {hasMetrics && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Latest: {latest?.accuracy ? `${(latest.accuracy * 100).toFixed(1)}%` : '—'}
                </span>
              )}
            </div>

            {hasMetrics ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trainingMetrics} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#a78bfa" dot={{ r: 3 }} strokeWidth={2.5} name="Train Accuracy" isAnimationActive={false} />
                  <Line type="monotone" dataKey="val_accuracy" stroke="#22d3ee" dot={{ r: 3 }} strokeWidth={2} strokeDasharray="5 5" name="Val Accuracy" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>Accuracy curve will stream live during training</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Click &quot;Start Local Training&quot; to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project's Saved Trained Models Section */}
      <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderDown size={18} style={{ color: 'var(--accent-violet-light)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Locally Saved Trained Models ({trainedModels.length})
            </h3>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchTrainedModelsList}
            style={{ fontSize: '0.75rem', gap: '0.35rem' }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {trainedModels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No models have been trained in this project yet. Click &quot;Start Local Training&quot; above to train your first model!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {trainedModels.map(m => (
              <div
                key={m.id}
                className="glass-card"
                style={{
                  padding: '1.125rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.875rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.model_name}
                    </h4>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      {m.final_accuracy !== null ? `${(m.final_accuracy * 100).toFixed(1)}% Acc` : 'Trained'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                    {m.relative_path} ({m.file_size_formatted})
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div><strong>Epochs:</strong> {m.epochs || 15}</div>
                    <div><strong>Loss:</strong> {m.final_loss ?? '—'}</div>
                    <div><strong>Val Acc:</strong> {m.val_accuracy ? `${(m.val_accuracy * 100).toFixed(1)}%` : '—'}</div>
                    <div><strong>Val Loss:</strong> {m.val_loss ?? '—'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <a
                    href={downloadTrainedModel(m.model_name, 'keras')}
                    download
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}
                  >
                    <Download size={12} />
                    .keras
                  </a>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExportToPretrained(m.model_name)}
                    disabled={exportingId === m.model_name}
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', gap: '0.25rem' }}
                  >
                    <Sparkles size={11} />
                    {exportingId === m.model_name ? 'Exporting...' : 'Fine-Tune'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
