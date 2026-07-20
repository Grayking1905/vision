import { X, Box, Layers, Hash, Cpu, Download, Play, Sparkles, Zap, Grid } from 'lucide-react';

const SIZE_THEMES = {
  small:  { color: '#34d399', label: 'Small · Edge-Ready' },
  medium: { color: '#fbbf24', label: 'Medium · Balanced' },
  large:  { color: '#fb7185', label: 'Large · High Capacity' },
};

const ARCHITECTURE_INFO = {
  mobilenet_v2: { family: 'MobileNet', type: 'Depthwise Separable CNN', year: 2018, paper: 'Sandler et al.', use: 'Mobile & edge deployment, real-time inference, resource-constrained devices' },
  resnet50: { family: 'ResNet', type: 'Residual CNN', year: 2015, paper: 'He et al.', use: 'Image classification, feature extraction, transfer learning baseline' },
  resnet101: { family: 'ResNet', type: 'Residual CNN', year: 2015, paper: 'He et al.', use: 'Complex vision tasks, object detection backbones, high-accuracy requirements' },
  vgg16: { family: 'VGG', type: 'Sequential CNN', year: 2014, paper: 'Simonyan & Zisserman', use: 'Style transfer, feature visualization, educational, classic benchmark' },
  efficientnet_b0: { family: 'EfficientNet', type: 'Compound Scaled CNN', year: 2019, paper: 'Tan & Le', use: 'Best accuracy/FLOP trade-off, efficient inference, mobile to server' },
  efficientnet_b3: { family: 'EfficientNet', type: 'Compound Scaled CNN', year: 2019, paper: 'Tan & Le', use: 'Higher accuracy variant, medium compute budget tasks' },
  inception_v3: { family: 'Inception', type: 'Multi-Scale CNN', year: 2015, paper: 'Szegedy et al.', use: 'Multi-scale feature extraction, fine-grained classification' },
  densenet121: { family: 'DenseNet', type: 'Dense Connected CNN', year: 2017, paper: 'Huang et al.', use: 'Feature reuse, medical imaging, small dataset transfer learning' },
  xception: { family: 'Xception', type: 'Depthwise Separable CNN', year: 2017, paper: 'Chollet', use: 'Efficient large-scale classification, Inception alternative' },
  nasnet_mobile: { family: 'NASNet', type: 'Neural Architecture Search CNN', year: 2018, paper: 'Zoph et al.', use: 'Auto-designed architecture, mobile deployment' },
};

export default function ModelDetailDrawer({ model, onClose, onLoad, loading, isLoaded }) {
  if (!model) return null;

  const theme = SIZE_THEMES[model.size] || SIZE_THEMES.medium;
  const arch = ARCHITECTURE_INFO[model.key] || {};

  return (
    <>
      <div className="model-detail-overlay" onClick={onClose} />
      <div className="model-detail-drawer">
        {/* Header */}
        <div className="model-detail-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
              }}>
                <Box size={24} style={{ color: 'white' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {model.name}
                </h2>
                <div style={{
                  fontSize: '0.7rem', fontWeight: 600, color: theme.color,
                  marginTop: '0.2rem',
                }}>
                  {theme.label}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem', borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-muted)', cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'white'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.color = 'var(--text-muted)'; }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Loaded status */}
          {isLoaded && (
            <div style={{
              marginTop: '0.75rem', padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              fontSize: '0.75rem', fontWeight: 600, color: '#34d399',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
              Model loaded in your project — ready for inspection & fine-tuning
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="model-detail-content">
          {/* Description */}
          <div className="model-detail-section">
            <div className="model-detail-section-title">
              <Sparkles size={12} /> Overview
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
              {model.description}
            </p>
          </div>

          {/* Spec cards */}
          <div className="model-detail-section">
            <div className="model-detail-section-title">
              <Cpu size={12} /> Model Specifications
            </div>
            <div className="model-detail-spec-grid">
              <div className="model-detail-spec-card">
                <div className="model-detail-spec-card-value">{model.params}</div>
                <div className="model-detail-spec-card-label">Parameters</div>
              </div>
              <div className="model-detail-spec-card">
                <div className="model-detail-spec-card-value">{model.input_shape.join('×')}</div>
                <div className="model-detail-spec-card-label">Input Shape</div>
              </div>
              <div className="model-detail-spec-card">
                <div className="model-detail-spec-card-value" style={{ fontSize: '1rem' }}>
                  {model.size === 'small' ? '~50ms' : model.size === 'medium' ? '~120ms' : '~250ms'}
                </div>
                <div className="model-detail-spec-card-label">Est. Inference</div>
              </div>
            </div>
          </div>

          {/* Architecture info */}
          {arch.family && (
            <div className="model-detail-section">
              <div className="model-detail-section-title">
                <Layers size={12} /> Architecture
              </div>
              <div className="model-detail-arch">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Family</span>
                    <div style={{ color: 'var(--accent-violet-light)', fontWeight: 600 }}>{arch.family}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
                    <div style={{ fontWeight: 600 }}>{arch.type}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</span>
                    <div style={{ fontWeight: 600 }}>{arch.year}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paper</span>
                    <div style={{ fontWeight: 600 }}>{arch.paper}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Use Cases */}
          {arch.use && (
            <div className="model-detail-section">
              <div className="model-detail-section-title">
                <Zap size={12} /> Best For
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
              }}>
                {arch.use.split(', ').map((useCase, i) => (
                  <span key={i} style={{
                    padding: '0.3rem 0.7rem', borderRadius: 100,
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    fontSize: '0.72rem', fontWeight: 500, color: 'var(--accent-violet-light)',
                  }}>
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pretrained on */}
          <div className="model-detail-section">
            <div className="model-detail-section-title">
              <Grid size={12} /> Pre-training Details
            </div>
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
            }}>
              <p style={{ margin: '0 0 0.4rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Dataset:</strong> ImageNet-1K (1.28M images, 1000 classes)
              </p>
              <p style={{ margin: '0 0 0.4rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Weights:</strong> Keras Applications (TensorFlow Hub)
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>License:</strong> Apache 2.0
              </p>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="model-detail-actions">
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
            onClick={() => onLoad(model.key)}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                <Play size={16} />
                {isLoaded ? 'Inspect Model' : 'Load Model'}
              </>
            )}
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
            onClick={() => {
              const url = `https://huggingface.co/models?search=${encodeURIComponent(model.name)}`;
              window.open(url, '_blank');
            }}
          >
            <Download size={16} />
            View on HuggingFace
          </button>
        </div>
      </div>
    </>
  );
}
