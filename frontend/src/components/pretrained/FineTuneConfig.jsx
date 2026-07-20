import { useEffect, useState } from 'react';
import HeadBuilder from './HeadBuilder';

export default function FineTuneConfig({ model, files, config, onChange, onSave, isSaving }) {
  const [localConfig, setLocalConfig] = useState({
    file_id: '',
    target_field: '',
    freeze_layers: 0,
    custom_head: [],
    learning_rate: 0.001,
    epochs: 10,
    batch_size: 32,
    problem_type: 1, // 1=Classification, 2=Regression
    optimizer: 'adam'
  });

  // Sync initial config from store
  // Sync initial config from store
  useEffect(() => {
    if (config && Object.keys(config).length > 0 && config !== localConfig) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalConfig(prev => ({ ...prev, ...config }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Handle local changes and push to parent
  const handleChange = (field, value) => {
    const next = { ...localConfig, [field]: value };
    setLocalConfig(next);
    onChange(next);
  };

  const selectedFile = files.find(f => f.id === localConfig.file_id);
  const targetOptions = selectedFile?.columns ? selectedFile.columns.split(',') : [];

  return (
    <div className="glass-card p-6 flex flex-col gap-6">
      <div className="border-b border-[rgba(255,255,255,0.1)] pb-4">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
          Sandbox Fine-Tuning
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Configure transfer learning for <strong className="text-[var(--text-primary)]">{model?.display_name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Data & Base Config */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="label">Dataset</label>
            <select 
              className="input w-full"
              value={localConfig.file_id}
              onChange={e => handleChange('file_id', e.target.value)}
            >
              <option value="">-- Select Dataset --</option>
              {files.map(f => (
                <option key={f.id} value={f.id}>{f.file_name}.{f.file_type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Target Field</label>
            <select 
              className="input w-full"
              value={localConfig.target_field || ''}
              onChange={e => handleChange('target_field', e.target.value)}
              disabled={!localConfig.file_id}
            >
              <option value="">-- Select Target (or last column) --</option>
              {targetOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label flex justify-between">
              <span>Freeze Base Layers</span>
              <span className="text-[var(--accent-cyan)]">{localConfig.freeze_layers} layers</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max={model?.layer_count || 100} 
              step="1"
              value={localConfig.freeze_layers}
              onChange={e => handleChange('freeze_layers', parseInt(e.target.value))}
              className="w-full mt-2"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Prevent the first N layers from updating to retain base features.
            </p>
          </div>

          <div>
            <label className="label">Problem Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="radio" 
                  name="problem_type" 
                  checked={localConfig.problem_type === 1}
                  onChange={() => handleChange('problem_type', 1)}
                  className="accent-[var(--accent-violet)]"
                />
                Classification
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="radio" 
                  name="problem_type" 
                  checked={localConfig.problem_type === 2}
                  onChange={() => handleChange('problem_type', 2)}
                  className="accent-[var(--accent-cyan)]"
                />
                Regression
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Head & Training Params */}
        <div className="flex flex-col gap-5">
          <HeadBuilder 
            value={localConfig.custom_head} 
            onChange={val => handleChange('custom_head', val)} 
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Learning Rate</label>
              <input 
                type="number" 
                step="0.0001"
                min="0.0001"
                className="input w-full"
                value={localConfig.learning_rate}
                onChange={e => handleChange('learning_rate', parseFloat(e.target.value))}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1 text-right">Default: 0.001</p>
            </div>
            <div>
              <label className="label">Optimizer</label>
              <select 
                className="input w-full"
                value={localConfig.optimizer}
                onChange={e => handleChange('optimizer', e.target.value)}
              >
                <option value="adam">Adam</option>
                <option value="sgd">SGD</option>
                <option value="rmsprop">RMSprop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Epochs</label>
              <input 
                type="number" 
                min="1"
                className="vision-input w-full"
                value={localConfig.epochs}
                onChange={e => handleChange('epochs', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Batch Size</label>
              <input 
                type="number" 
                min="1"
                className="vision-input w-full"
                value={localConfig.batch_size}
                onChange={e => handleChange('batch_size', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <button 
          className="btn btn-primary"
          onClick={() => onSave(localConfig)}
          disabled={isSaving || !localConfig.file_id}
        >
          {isSaving ? <div className="spinner w-4 h-4" /> : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
