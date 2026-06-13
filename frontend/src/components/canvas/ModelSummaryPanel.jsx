import { X, Cpu } from 'lucide-react';

export default function ModelSummaryPanel({ summary, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} style={{ color: 'var(--accent-violet-light)' }} />
            <h3>Model Saved ✓</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {summary?.layers?.length > 0 && (
          <div>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Architecture Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 300, overflowY: 'auto' }}>
              {summary.layers.map((layer, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  fontSize: '0.8125rem',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>{layer.type}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{layer.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Go to Training →</button>
        </div>
      </div>
    </div>
  );
}
