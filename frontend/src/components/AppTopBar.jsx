import { Link, useLocation } from 'react-router-dom';

export default function AppTopBar() {
  const location = useLocation();
  const isProjects = location.pathname === '/projects';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      height: '56px',
      background: 'rgba(10, 10, 15, 0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexShrink: 0,
    }}>
      <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '8px',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: 900,
          color: 'white',
          boxShadow: '0 0 16px rgba(124,58,237,0.4)',
        }}>V</div>
        <span style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.01em' }} className="gradient-text">
          Vision
        </span>
        <span style={{
          fontSize: '0.7rem',
          padding: '0.1rem 0.4rem',
          borderRadius: '4px',
          background: 'rgba(124,58,237,0.15)',
          color: '#a78bfa',
          fontWeight: 600,
          border: '1px solid rgba(124,58,237,0.3)',
        }}>BETA</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live</span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.75rem' }}
        >
          Docs
        </a>
      </div>
    </header>
  );
}
