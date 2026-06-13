import { Outlet, NavLink, useParams } from 'react-router-dom';
import { Database, GitBranch, Cpu, Activity, ChevronRight } from 'lucide-react';

const navItems = [
  { to: 'dataset', label: 'Dataset', icon: Database, description: 'Upload & manage data' },
  { to: 'process', label: 'Process', icon: GitBranch, description: 'EDA & preprocessing' },
  { to: 'canvas', label: 'Canvas', icon: Cpu, description: 'Build neural network' },
  { to: 'training', label: 'Training', icon: Activity, description: 'Train & monitor' },
];

export default function WorkspaceLayout() {
  const { projectId } = useParams();

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: 'rgba(10, 10, 15, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem 0.75rem',
        gap: '0.25rem',
        overflowY: 'auto',
      }}>
        <div style={{ marginBottom: '1rem', padding: '0 0.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Workspace
          </p>
        </div>

        {navItems.map(({ to, label, icon: Icon, description }) => (
          <NavLink
            key={to}
            to={`/workspace/${projectId}/${to}`}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            style={{ marginBottom: '0.125rem' }}
          >
            <Icon size={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{description}</div>
            </div>
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.15)',
          }}>
            <p style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.25rem' }}>Pipeline</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>Data</span>
              <ChevronRight size={10} />
              <span>Process</span>
              <ChevronRight size={10} />
              <span>Canvas</span>
              <ChevronRight size={10} />
              <span>Train</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
