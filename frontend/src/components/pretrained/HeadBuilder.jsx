

export default function HeadBuilder({ value = [], onChange }) {
  const addLayer = () => {
    onChange([...value, { units: 128, activation: 'relu' }]);
  };

  const removeLayer = (idx) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  const updateLayer = (idx, field, val) => {
    const next = [...value];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="bg-[rgba(0,0,0,0.2)] p-4 rounded-lg border border-[rgba(255,255,255,0.05)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-sm font-medium">Custom Classification Head</h4>
          <p className="text-xs text-[var(--text-muted)]">Added after GlobalAveragePooling2D</p>
        </div>
        <button 
          type="button"
          onClick={addLayer}
          className="text-xs px-3 py-1.5 rounded bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] transition-colors"
        >
          + Add Dense
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {value.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] text-center py-4 border border-dashed border-[rgba(255,255,255,0.1)] rounded">
            No hidden layers. Output layer connects directly to pool.
          </div>
        ) : (
          value.map((layer, idx) => (
            <div key={idx} className="flex gap-3 items-end bg-[rgba(255,255,255,0.03)] p-3 rounded">
              <div className="flex-1">
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Units</label>
                <input 
                  type="number" 
                  min="1"
                  className="input w-full text-sm py-1.5"
                  value={layer.units}
                  onChange={e => updateLayer(idx, 'units', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Activation</label>
                <select 
                  className="input w-full text-sm py-1.5"
                  value={layer.activation}
                  onChange={e => updateLayer(idx, 'activation', e.target.value)}
                >
                  <option value="relu">ReLU</option>
                  <option value="sigmoid">Sigmoid</option>
                  <option value="tanh">Tanh</option>
                  <option value="linear">Linear</option>
                </select>
              </div>
              <button 
                type="button"
                onClick={() => removeLayer(idx)}
                className="p-2 hover:text-rose-400 transition-colors"
                title="Remove layer"
              >
                ✕
              </button>
            </div>
          ))
        )}

        {/* Output Layer Visualization */}
        <div className="mt-2 flex items-center justify-between p-3 rounded bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[var(--accent-violet)]">
          <span className="text-sm font-medium">Output Layer</span>
          <span className="text-xs bg-[rgba(0,0,0,0.3)] px-2 py-1 rounded">Auto-configured</span>
        </div>
      </div>
    </div>
  );
}
