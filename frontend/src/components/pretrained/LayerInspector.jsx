import { useState } from 'react';

export default function LayerInspector({ summary }) {
  const [expanded, setExpanded] = useState(false);

  if (!summary || !summary.layers) return null;

  const displayLayers = expanded ? summary.layers : summary.layers.slice(0, 5);
  const hiddenCount = summary.layers.length - 5;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-[rgba(255,255,255,0.02)]">
        <h3 className="font-semibold">Architecture Summary</h3>
        <div className="flex gap-4 text-sm text-[var(--text-muted)]">
          <span>Total Params: <strong className="text-[var(--text-primary)]">{summary.total_params.toLocaleString()}</strong></span>
          <span>Trainable: <strong className="text-[var(--text-primary)]">{summary.trainable_params.toLocaleString()}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-[rgba(0,0,0,0.2)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Layer (type)</th>
              <th className="px-4 py-3">Output Shape</th>
              <th className="px-4 py-3">Param #</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {displayLayers.map((layer, idx) => (
              <tr key={idx} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium">{layer.name}</span>
                  <span className="text-[var(--text-muted)] ml-2">({layer.type})</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{layer.output_shape}</td>
                <td className="px-4 py-3 font-mono text-xs">{layer.param_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 text-sm text-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          {expanded ? 'Show Less' : `Show ${hiddenCount} More Layers`}
        </button>
      )}
    </div>
  );
}
