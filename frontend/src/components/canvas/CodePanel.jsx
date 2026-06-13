import { useState } from 'react';
import { Copy, Download, Check, Loader } from 'lucide-react';

export default function CodePanel({ code, loading, modelName }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${modelName || 'model'}.py`;
    link.click();
  };

  // Simple syntax highlighting
  const highlight = (raw) => {
    if (!raw) return '';
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(import|from|as|def|class|return|if|else|for|in|and|or|not|True|False|None)\b/g, '<span style="color:#c084fc">$1</span>')
      .replace(/(tf\.keras\.\S+|tf\.\S+)/g, '<span style="color:#22d3ee">$1</span>')
      .replace(/(#[^\n]*)/g, '<span style="color:#64748b;font-style:italic">$1</span>')
      .replace(/'([^']*)'/g, "<span style=\"color:#86efac\">'$1'</span>")
      .replace(/(\d+\.?\d*)/g, '<span style="color:#fbbf24">$1</span>');
  };

  return (
    <div className="code-panel" style={{ height: '100%' }}>
      {/* Header */}
      <div className="code-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="code-panel-dots">
            <div className="code-panel-dot" style={{ background: '#ef4444' }} />
            <div className="code-panel-dot" style={{ background: '#f59e0b' }} />
            <div className="code-panel-dot" style={{ background: '#22c55e' }} />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {modelName || 'model'}.py
          </span>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Loader size={12} style={{ color: 'var(--accent-violet-light)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Transpiling...</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleCopy} title="Copy code">
            {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleDownload} title="Download .py file" disabled={!code}>
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Code body */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1rem 1.25rem',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem',
        lineHeight: 1.7,
        color: '#e2e8f0',
      }}>
        {code ? (
          <pre
            style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: highlight(code) }}
          />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '0.5rem' }}>
            Drag layers onto the canvas — Python code will appear here in real-time ✨
          </div>
        )}
      </div>
    </div>
  );
}
