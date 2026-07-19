import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, Menu, X, LayoutGrid } from 'lucide-react';
import { getProjects, createProject, deleteProject } from '../services/api';
import { useAppStore } from '../stores/appStore';

// 3D Sphere Component
const Sphere = () => {
  const numItems = 60;
  
  const getTransform = (i, n) => {
    const y = 1 - (i / (n - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = 2.39996323 * i; 
    
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    
    const rotY = Math.atan2(x, z) * (180 / Math.PI);
    const rotX = Math.asin(-y) * (180 / Math.PI);
    
    return `rotateY(${rotY}deg) rotateX(${rotX}deg) translateZ(200px)`;
  };

  return (
    <div style={{
      perspective: '1200px',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    }}>
      <style>{`
        @keyframes rotateSphere {
          0% { transform: rotateY(0deg) rotateX(10deg); }
          100% { transform: rotateY(360deg) rotateX(10deg); }
        }
      `}</style>
      <div style={{
        width: '2px',
        height: '2px',
        position: 'relative',
        transformStyle: 'preserve-3d',
        animation: 'rotateSphere 30s infinite linear',
      }}>
        {Array.from({ length: numItems }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: '-35px',
            left: '-35px',
            width: '70px',
            height: '70px',
            background: '#fff',
            border: '2px solid #3d2524',
            transform: getTransform(i, numItems),
            backgroundImage: `url(https://picsum.photos/70/70?random=${i})`,
            backgroundSize: 'cover',
            boxShadow: '2px 2px 0 rgba(61,37,36,0.2)',
            backfaceVisibility: 'hidden',
          }} />
        ))}
      </div>
    </div>
  );
};

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
      navigate(`/workspace/${newProject.id}/canvas`);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      
      {/* Top Header matching reference */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(61, 37, 36, 0.1)',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', background: '#3d2524', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#3d2524', borderRadius: '50%', transform: 'translateY(-6px)' }} />
          <div style={{ width: '8px', height: '8px', background: '#3d2524', borderRadius: '50%' }} />
        </div>

        <nav style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ cursor: 'pointer' }}>MEMORABLE EXPERIENCE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#2d4a22', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem' }}>NEW</span>
            <span style={{ cursor: 'pointer' }}>MODEL HUB</span>
          </div>
          <span style={{ cursor: 'pointer' }}>LEARN ML</span>
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button style={{ border: '1px solid #3d2524', background: 'transparent', padding: '0.4rem 1rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
            MENU <Menu size={14} />
          </button>
          <button style={{ border: '1px solid #3d2524', background: 'transparent', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
          <button style={{ background: '#3d2524', color: '#f0e6da', padding: '0.4rem 1.25rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, border: 'none' }}>
            Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ position: 'relative', height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Sphere Background Lines */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
          {/* Diagonal lines to simulate the rays originating from center */}
          <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', background: 'rgba(61,37,36,0.1)', transform: 'rotate(20deg)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', background: 'rgba(61,37,36,0.1)', transform: 'rotate(-20deg)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', background: 'rgba(61,37,36,0.1)', transform: 'rotate(60deg)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', background: 'rgba(61,37,36,0.1)', transform: 'rotate(-60deg)' }} />
        </div>

        {/* 3D Sphere */}
        <Sphere />

        {/* Corner Texts */}
        <div style={{ position: 'absolute', top: '2rem', left: '2rem', width: '250px', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5, zIndex: 20 }}>
          " " THE ONLY TOOL YOU WILL NEED TO MASTER MACHINE LEARNING.
        </div>
        
        <div style={{ position: 'absolute', top: '2rem', right: '2rem', width: '280px', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5, textAlign: 'right', zIndex: 20 }}>
          " " YOU WILL BE A MASTER ON:<br />
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>NEURAL ARCHITECTURE</span>
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5, zIndex: 20 }}>
          NEW FEATURE:<br />
          SANDBOX FINE-TUNING ⚡🔥
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', fontWeight: 600, zIndex: 20 }}>
          THE VISION ML ULTIMATE GUIDE
          <div style={{ width: '32px', height: '32px', border: '1px solid #3d2524', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↓
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section style={{ padding: '4rem 2rem', borderTop: '1px solid rgba(61, 37, 36, 0.1)', background: 'rgba(255,255,255,0.2)', flex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>YOUR WORKSPACES</h2>
            <button 
              style={{ background: '#3d2524', color: '#f0e6da', padding: '0.6rem 1.5rem', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} /> NEW PROJECT
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: 600 }}>LOADING PROJECTS...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', border: '2px dashed rgba(61,37,36,0.3)', borderRadius: '12px' }}>
              <LayoutGrid size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600 }}>NO PROJECTS YET. CREATE YOUR FIRST TO GET STARTED.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  style={{ 
                    background: '#fff', 
                    border: '2px solid #3d2524', 
                    borderRadius: '8px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    boxShadow: '4px 4px 0 rgba(61,37,36,0.15)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => { setCurrentProject(project); navigate(`/workspace/${project.id}/canvas`); }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '8px',
                      background: '#3d2524',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#f0e6da',
                    }}>
                      {project.name[0].toUpperCase()}
                    </div>
                    <button
                      style={{ background: 'transparent', border: 'none', color: '#8a2b2b', cursor: 'pointer', padding: '0.25rem' }}
                      onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                      title="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {project.name}
                  </h3>
                  {project.description && (
                    <p style={{ fontSize: '0.85rem', color: 'rgba(61,37,36,0.7)', marginBottom: '1.5rem', lineHeight: 1.5, minHeight: '2.5rem' }}>
                      {project.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(61,37,36,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(61,37,36,0.5)' }}>
                      {project.created_on ? new Date(project.created_on).toLocaleDateString() : 'RECENTLY CREATED'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 800 }}>
                      OPEN <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(240,230,218,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', border: '2px solid #3d2524', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '480px', boxShadow: '8px 8px 0 rgba(61,37,36,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>NEW PROJECT</h3>
            <p style={{ fontSize: '0.9rem', color: 'rgba(61,37,36,0.7)', marginBottom: '2rem' }}>DEFINE YOUR NEW MACHINE LEARNING WORKSPACE.</p>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>PROJECT NAME *</label>
                <input
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #3d2524', borderRadius: '6px', background: 'transparent', fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }}
                  placeholder="E.G. IRIS CLASSIFIER"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '2.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>DESCRIPTION</label>
                <input
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid rgba(61,37,36,0.3)', borderRadius: '6px', background: 'transparent', fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }}
                  placeholder="BRIEF DESCRIPTION..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ background: 'transparent', border: 'none', fontWeight: 800, cursor: 'pointer', padding: '0.5rem 1rem' }} onClick={() => setShowCreate(false)}>CANCEL</button>
                <button type="submit" style={{ background: '#3d2524', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.75rem 1.5rem', fontWeight: 800, cursor: 'pointer' }} disabled={creating || !form.name.trim()}>
                  {creating ? 'CREATING...' : 'CREATE WORKSPACE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(240,230,218,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDeleteId(null)}>
          <div style={{ background: '#fff', border: '2px solid #3d2524', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '8px 8px 0 rgba(61,37,36,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase', color: '#8a2b2b' }}>DELETE PROJECT?</h3>
            <p style={{ fontSize: '0.9rem', color: 'rgba(61,37,36,0.7)', marginBottom: '2rem', lineHeight: 1.5 }}>
              THIS WILL DELETE ALL DATASETS, MODELS, AND CONFIGURATIONS. THIS CANNOT BE UNDONE.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button style={{ background: 'transparent', border: 'none', fontWeight: 800, cursor: 'pointer', padding: '0.5rem 1rem' }} onClick={() => setDeleteId(null)}>CANCEL</button>
              <button style={{ background: '#8a2b2b', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.75rem 1.5rem', fontWeight: 800, cursor: 'pointer' }} onClick={() => handleDelete(deleteId)}>
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
