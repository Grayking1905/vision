import { useState, useCallback } from 'react';
import { GitBranch, Folder, File, RefreshCw, ChevronRight, ArrowUpToLine, ArrowDownToLine, ExternalLink, Lock, Globe } from 'lucide-react';
import { getGHRepos, getGHRepoContents, pullGHRepo } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

export default function GitHubPanel() {
  const addToast = useAppStore(s => s.addToast);
  const tokens = useAppStore(s => s.integrationTokens);

  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoContents, setRepoContents] = useState([]);
  const [contentPath, setContentPath] = useState([]);
  const [cloning, setCloning] = useState(null);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGHRepos(30, 1);
      setRepos(data.results || []);
    } catch (err) {
      addToast('Failed to load repos: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const browseRepo = async (owner, repo, path = '') => {
    try {
      const data = await getGHRepoContents(owner, repo, path);
      setRepoContents(data.results || []);
      if (path) {
        setContentPath(prev => [...prev, path.split('/').pop()]);
      } else {
        setContentPath([]);
      }
    } catch (err) {
      addToast('Failed to load contents: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleClone = async (owner, repo) => {
    setCloning(`${owner}/${repo}`);
    try {
      await pullGHRepo(owner, repo, { owner, repo, branch: 'main' });
      addToast(`Cloned ${owner}/${repo}!`, 'success');
    } catch (err) {
      addToast('Clone failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setCloning(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!tokens.github_configured && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          color: '#fbbf24',
        }}>
          ⚠️ GitHub token not configured. Add your personal access token in Settings to list your repositories.
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={fetchRepos} disabled={loading || !tokens.github_configured}>
          {loading ? <RefreshCw size={14} className="spinner" /> : <GitBranch size={14} />}
          Load My Repos
        </button>

        {selectedRepo && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedRepo(null); setRepoContents([]); setContentPath([]); }}>
            ← Back to repos
          </button>
        )}
      </div>

      {/* Repo browser or repo list */}
      {selectedRepo ? (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <GitBranch size={16} style={{ color: 'var(--accent-violet)' }} />
            <span style={{ fontWeight: 600 }}>{selectedRepo.full_name}</span>
            <a href={selectedRepo.html_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--accent-cyan)' }}>
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Breadcrumb */}
          {contentPath.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}
                onClick={() => browseRepo(selectedRepo.full_name.split('/')[0], selectedRepo.name)}>
                root
              </button>
              {contentPath.map((p, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <ChevronRight size={10} /> {p}
                </span>
              ))}
            </div>
          )}

          {/* File tree */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {repoContents.map(item => (
              <div
                key={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  cursor: item.type === 'dir' ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onClick={() => {
                  if (item.type === 'dir') browseRepo(selectedRepo.full_name.split('/')[0], selectedRepo.name, item.path);
                }}
              >
                {item.type === 'dir' ? <Folder size={14} style={{ color: '#fbbf24' }} /> : <File size={14} style={{ color: 'var(--text-muted)' }} />}
                <span style={{ fontSize: '0.8rem', flex: 1 }}>{item.name}</span>
                {item.size > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{(item.size / 1024).toFixed(1)} KB</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '0.75rem',
        }}>
          {repos.map(repo => (
            <div key={repo.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {repo.private ? <Lock size={12} style={{ color: '#fbbf24' }} /> : <Globe size={12} style={{ color: 'var(--accent-emerald)' }} />}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {repo.name}
                    </span>
                  </div>
                  {repo.description && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {repo.description}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                {repo.language && <span className="badge badge-violet" style={{ fontSize: '0.6rem' }}>{repo.language}</span>}
                <span>⭐ {repo.stars}</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => {
                  setSelectedRepo(repo);
                  browseRepo(repo.full_name.split('/')[0], repo.name);
                }}>
                  <Folder size={12} /> Browse
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleClone(repo.full_name.split('/')[0], repo.name)}
                  disabled={cloning === repo.full_name}
                >
                  {cloning === repo.full_name ? <RefreshCw size={12} className="spinner" /> : <ArrowDownToLine size={12} />}
                  Clone
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {repos.length === 0 && !loading && !selectedRepo && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <GitBranch size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p>Click "Load My Repos" to see your GitHub repositories.</p>
        </div>
      )}
    </div>
  );
}
