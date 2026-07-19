

export default function ModelCard({ model, onLoad, loading }) {
  const badgeColor = 
    model.size === 'small' ? 'bg-emerald-500/20 text-emerald-400' :
    model.size === 'medium' ? 'bg-amber-500/20 text-amber-400' :
    'bg-rose-500/20 text-rose-400';

  return (
    <div className="glass-card p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">{model.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>
          {model.size}
        </span>
      </div>
      
      <p className="text-sm text-[var(--text-muted)] line-clamp-2" title={model.description}>
        {model.description}
      </p>
      
      <div className="flex-1" />
      
      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] bg-[rgba(0,0,0,0.2)] p-3 rounded-md mb-3">
        <div>
          <span className="block opacity-70">Parameters</span>
          <span className="font-mono text-[var(--text-primary)]">{model.params}</span>
        </div>
        <div>
          <span className="block opacity-70">Input Shape</span>
          <span className="font-mono text-[var(--text-primary)]">
            {model.input_shape.join(' × ')}
          </span>
        </div>
      </div>
      
      <button 
        className="btn btn-primary w-full justify-center"
        onClick={() => onLoad(model.key)}
        disabled={loading}
      >
        {loading ? <div className="spinner w-4 h-4" /> : 'Load Model'}
      </button>
    </div>
  );
}
