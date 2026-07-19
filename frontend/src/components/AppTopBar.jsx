import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export default function AppTopBar() {
  const location = useLocation();
  const { theme, toggleTheme } = useAppStore();
  const isProjects = location.pathname === '/projects';

  return (
    <header className="app-topbar">
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
          boxShadow: 'var(--shadow-glow-violet)',
        }}>V</div>
        <span style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.01em' }} className="gradient-text">
          Vision
        </span>
        <span style={{
          fontSize: '0.7rem',
          padding: '0.1rem 0.4rem',
          borderRadius: '4px',
          background: 'var(--accent-violet-glow)',
          color: 'var(--accent-violet)',
          fontWeight: 600,
          border: '1px solid var(--border-accent)',
        }}>BETA</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleTheme} 
          className="btn btn-icon btn-ghost" 
          title="Toggle Theme"
          style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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
