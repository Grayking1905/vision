import { useEffect, useRef } from 'react';

/**
 * Shared real-time terminal output component.
 * Renders lines streamed via Socket.IO.
 */
export default function TerminalOutput({ lines = [], maxHeight = '320px' }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  return (
    <div style={{
      background: '#0a0a12',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontFamily: 'var(--font-mono)' }}>
          Terminal
        </span>
      </div>

      {/* Output area */}
      <div style={{
        maxHeight,
        overflowY: 'auto',
        padding: '0.75rem',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {lines.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>Waiting for output…</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} style={{ color: line.type === 'stderr' ? '#fb7185' : '#a3e635' }}>
              {line.data}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
