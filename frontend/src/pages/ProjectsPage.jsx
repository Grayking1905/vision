import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, Brain, Layers, Zap, BarChart3 } from 'lucide-react';
import { getProjects, createProject, deleteProject } from '../services/api';
import { useAppStore } from '../stores/appStore';

const features = [
  { icon: Layers, label: 'Drag & Drop', desc: 'Build neural networks visually' },
  { icon: Zap, label: 'Live Code', desc: 'Real-time Python transpilation' },
  { icon: Brain, label: 'Smart EDA', desc: 'Correlation heatmaps & stats' },
  { icon: BarChart3, label: 'Live Training', desc: 'Real-time loss/accuracy charts' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { addToast, setCurrentProject } = useAppStore();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    getProjects()
      .then(res => setProjects(res.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await createProject({ name: form.name.trim(), description: form.description.trim() || null });
      const newProject = res.data;
      setProjects(prev => [newProject, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '' });
      addToast(`Project "${newProject.name}" created!`);
      navigate(`/workspace/${newProject.id}`);
    } catch (err) {
      addToast('Failed to create project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      addToast('Project deleted');
    } catch {
      addToast('Failed to delete project', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div style={{ flex: 1, padding: '0 1.5rem 3rem' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '5rem 1rem 3rem',
        maxWidth: '700px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 1rem',
          borderRadius: '100px',
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.25)',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#a78bfa',
        }}>
          <Zap size={13} />
          Lego for Machine Learning
        </div>

        <h1 className="animate-in" style={{ marginBottom: '1rem' }}>
          Build AI without writing{' '}
          <span className="gradient-text">a single line</span> of code
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Drag layers, connect flows, watch Python appear. Then train live and download your model.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginBottom: '3rem' }}>
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              fontSize: '0.8125rem',
            }}>
              <Icon size={14} style={{ color: 'var(--accent-violet-light)' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
              <span style={{ color: 'var(--text-muted)' }}>— {desc}</span>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={() => setShowCreate(true)}
          style={{ fontSize: '1rem' }}
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      {!loading && projects.length > 0 && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Your Projects</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {projects.map((project) => (
              <div
                key={project.id}
                className="glass-card animate-in"
                style={{ padding: '1.5rem', cursor: 'pointer', position: 'relative' }}
                onClick={() => { setCurrentProject(project); navigate(`/workspace/${project.id}`); }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: 'white',
                  }}>
                    {project.name[0].toUpperCase()}
                  </div>
                  <button
                    className="btn btn-danger btn-icon"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  {project.name}
                </h3>
                {project.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {project.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {project.created_on ? new Date(project.created_on).toLocaleDateString() : 'Recently created'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: '#a78bfa', fontWeight: 600 }}>
                    Open <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && projects.length === 0 && !showCreate && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.9rem' }}>No projects yet. Create your first to get started.</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>New Project</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>Give your ML project a name to get started.</p>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Project Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Iris Classifier"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Description (optional)</label>
                <input
                  className="input"
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !form.name.trim()}>
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Project?</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>This will delete all datasets, models, and configurations. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
