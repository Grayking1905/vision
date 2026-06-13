import { Save } from 'lucide-react';

const NODE_CONFIGS = {
  input: [
    { key: 'dim-1', label: 'Dim 1', type: 'number', placeholder: 'e.g. 784' },
    { key: 'dim-2', label: 'Dim 2 (optional)', type: 'number', placeholder: 'e.g. 28' },
    { key: 'dim-3', label: 'Dim 3 (optional)', type: 'number', placeholder: 'e.g. 1' },
  ],
  dense: [
    { key: 'units', label: 'Units', type: 'number', placeholder: '64' },
    { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'selu', 'none'] },
  ],
  conv: [
    { key: 'filters', label: 'Filters', type: 'number', placeholder: '32' },
    { key: 'kernelX', label: 'Kernel X', type: 'number', placeholder: '3' },
    { key: 'kernelY', label: 'Kernel Y', type: 'number', placeholder: '3' },
    { key: 'strideX', label: 'Stride X', type: 'number', placeholder: '1' },
    { key: 'strideY', label: 'Stride Y', type: 'number', placeholder: '1' },
    { key: 'padding', label: 'Padding', type: 'select', options: ['valid', 'same'] },
    { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'sigmoid', 'tanh', 'linear', 'none'] },
  ],
  flatten: [],
  dropout: [{ key: 'rate', label: 'Rate (0-1)', type: 'number', placeholder: '0.5', step: '0.05', min: 0, max: 0.9 }],
  maxpool: [{ key: 'poolSize', label: 'Pool Size', type: 'number', placeholder: '2' }],
  batchnorm: [],
};

const TYPE_LABELS = {
  input: 'Input Layer',
  dense: 'Dense Layer',
  conv: 'Conv2D Layer',
  flatten: 'Flatten Layer',
  dropout: 'Dropout Layer',
  maxpool: 'MaxPooling2D',
  batchnorm: 'Batch Normalization',
};

export default function NodePropertiesPanel({ selectedNode, modelName, onModelNameChange, onSave, saving, canSave, onNodeUpdate }) {
  const config = selectedNode ? NODE_CONFIGS[selectedNode.type] || [] : [];

  const handleChange = (key, value) => {
    onNodeUpdate(selectedNode.id, { ...selectedNode.data.params, [key]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Model name + save */}
      <div className="glass-card-elevated" style={{ padding: '1rem' }}>
        <label className="label">Model Name</label>
        <input
          className="input"
          style={{ marginBottom: '0.75rem' }}
          placeholder="e.g. my_classifier"
          value={modelName}
          onChange={e => onModelNameChange(e.target.value)}
        />
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={!canSave || saving}
          onClick={onSave}
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Model'}
        </button>
      </div>

      {/* Node properties */}
      {selectedNode ? (
        <div className="glass-card-elevated" style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{
              width: 6,
              height: 20,
              borderRadius: 3,
              background: 'var(--gradient-primary)',
              flexShrink: 0,
            }} />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>{TYPE_LABELS[selectedNode.type] || selectedNode.type}</h3>
          </div>

          {config.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No configurable parameters</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {config.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="select"
                      value={selectedNode.data.params?.[field.key] ?? field.options[0]}
                      onChange={e => handleChange(field.key, e.target.value)}
                    >
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={field.type}
                      placeholder={field.placeholder}
                      step={field.step || (field.type === 'number' ? '1' : undefined)}
                      min={field.min}
                      max={field.max}
                      value={selectedNode.data.params?.[field.key] ?? ''}
                      onChange={e => handleChange(field.key, field.type === 'number' ? parseFloat(e.target.value) || e.target.value : e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              id: {selectedNode.id.slice(0, 16)}...
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card-elevated" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Click a node to configure its parameters
          </p>
        </div>
      )}
    </div>
  );
}
