import { Box, Layers, Hash, Eye, Download } from 'lucide-react';

const SIZE_THEMES = {
  small:  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', color: '#34d399', icon: '⚡' },
  medium: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)', color: '#fbbf24', icon: '🔥' },
  large:  { bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)',  color: '#fb7185', icon: '🚀' },
};

export default function ModelCard({ model, onLoad, onDetail, loading, isLoaded }) {
  const theme = SIZE_THEMES[model.size] || SIZE_THEMES.medium;

  return (
    <div className="model-card" onClick={() => onDetail?.(model)}>
      <div className="model-card-glow" />

      {/* Loaded badge */}
      {isLoaded && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 5,
          padding: '0.2rem 0.6rem', borderRadius: 100,
          background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
          fontSize: '0.6rem', fontWeight: 700, color: '#34d399',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: '0.25rem',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
          Loaded
        </div>
      )}

      {/* Header */}
      <div className="model-card-header">
        <div className="model-card-icon" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
          <Box size={20} style={{ color: theme.color }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {model.name}
          </div>
          <div style={{
            fontSize: '0.65rem', fontWeight: 600, color: theme.color,
            background: theme.bg, border: `1px solid ${theme.border}`,
            padding: '0.1rem 0.5rem', borderRadius: 100,
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            marginTop: '0.3rem', textTransform: 'capitalize',
          }}>
            {theme.icon} {model.size}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="model-card-body">
        <div className="model-card-desc">{model.description}</div>
      </div>

      {/* Specs */}
      <div className="model-card-specs">
        <div>
          <div className="model-card-spec-label">
            <Layers size={10} /> Parameters
          </div>
          <div className="model-card-spec-value">{model.params}</div>
        </div>
        <div>
          <div className="model-card-spec-label">
            <Hash size={10} /> Input
          </div>
          <div className="model-card-spec-value">{model.input_shape.join('×')}</div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="model-card-footer">
        <button
          className="model-card-btn model-card-btn-primary"
          onClick={(e) => { e.stopPropagation(); onLoad(model.key); }}
          disabled={loading}
        >
          {loading ? (
            <div className="spinner" style={{ width: 14, height: 14 }} />
          ) : (
            <>
              <Download size={14} />
              {isLoaded ? 'Inspect' : 'Load'}
            </>
          )}
        </button>
        <button
          className="model-card-btn model-card-btn-ghost"
          onClick={(e) => { e.stopPropagation(); onDetail?.(model); }}
        >
          <Eye size={14} />
          Details
        </button>
      </div>
    </div>
  );
}
