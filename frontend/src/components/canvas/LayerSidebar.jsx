const LAYERS = [
  { type: 'input', label: 'Input', icon: '⬡', color: '#22d3ee', desc: 'Entry point, define shape' },
  { type: 'dense', label: 'Dense', icon: '◈', color: '#a78bfa', desc: 'Fully connected layer' },
  { type: 'conv', label: 'Conv2D', icon: '⊞', color: '#fbbf24', desc: 'Convolutional layer' },
  { type: 'flatten', label: 'Flatten', icon: '≡', color: '#34d399', desc: 'Flatten to 1D' },
  { type: 'dropout', label: 'Dropout', icon: '⊗', color: '#fb7185', desc: 'Regularization layer' },
  { type: 'maxpool', label: 'MaxPool2D', icon: '⊟', color: '#fde047', desc: 'Spatial downsampling' },
  { type: 'batchnorm', label: 'BatchNorm', icon: '≋', color: '#c4b5fd', desc: 'Normalize activations' },
];

export default function LayerSidebar() {
  const onDragStart = (e, type) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{
      width: '168px',
      flexShrink: 0,
      background: 'rgba(10,10,15,0.5)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.875rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.375rem',
      overflowY: 'auto',
    }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Layers
      </p>
      {LAYERS.map(({ type, label, icon, color, desc }) => (
        <div
          key={type}
          className="layer-palette-item"
          draggable
          onDragStart={e => onDragStart(e, type)}
          title={desc}
        >
          <div
            className="layer-palette-icon"
            style={{ background: `${color}20`, color }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{desc}</div>
          </div>
        </div>
      ))}

      <hr className="divider" style={{ margin: '0.5rem 0' }} />
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Drag layers onto the canvas to build your architecture
      </p>
    </div>
  );
}
