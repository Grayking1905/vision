import { useState, useCallback } from 'react';
import { Search, Download, Star, ArrowDownToLine, Layers, Database, Sparkles, RefreshCw } from 'lucide-react';
import { searchHFModels, searchHFDatasets, searchHFSpaces, downloadHFRepo } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

const SUB_TABS = [
  { key: 'models', label: 'Models', icon: Layers },
  { key: 'datasets', label: 'Datasets', icon: Database },
  { key: 'spaces', label: 'Spaces', icon: Sparkles },
];

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function HuggingFacePanel() {
  const addToast = useAppStore(s => s.addToast);
  const tokens = useAppStore(s => s.integrationTokens);

  const [subTab, setSubTab] = useState('models');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const searchFn = subTab === 'models' ? searchHFModels : subTab === 'datasets' ? searchHFDatasets : searchHFSpaces;
      const data = await searchFn(query, 20, subTab === 'spaces' ? 'likes' : 'downloads');
      setResults(data.results || []);
    } catch (err) {
      addToast('Search failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [query, subTab, addToast]);

  const handleDownload = async (repoId) => {
    setDownloading(repoId);
    try {
      await downloadHFRepo({ repo_id: repoId, repo_type: subTab === 'spaces' ? 'space' : subTab.slice(0, -1) });
      addToast(`Downloaded ${repoId}!`, 'success');
    } catch (err) {
      addToast('Download failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Token warning */}
      {!tokens.huggingface_configured && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          color: '#fbbf24',
        }}>
          ⚠️ Hugging Face token not configured. Some features may be limited. Use the Settings button to add your token.
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`btn btn-sm ${subTab === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setSubTab(key); setResults([]); }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder={`Search ${subTab}…`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spinner" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Results grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.75rem',
      }}>
        {results.map((item) => (
          <div key={item.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.id}
                </div>
                {item.author && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    by {item.author}
                  </div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => handleDownload(item.id)}
                disabled={downloading === item.id}
                title="Download"
              >
                {downloading === item.id ? <RefreshCw size={12} className="spinner" /> : <ArrowDownToLine size={14} />}
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {item.downloads !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Download size={10} /> {formatNumber(item.downloads)}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Star size={10} /> {formatNumber(item.likes || 0)}
              </span>
              {item.pipeline_tag && <span className="badge badge-violet" style={{ fontSize: '0.6rem' }}>{item.pipeline_tag}</span>}
              {item.sdk && <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{item.sdk}</span>}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {item.tags.slice(0, 4).map(t => (
                  <span key={t} style={{
                    padding: '0.1rem 0.4rem',
                    borderRadius: '100px',
                    background: 'rgba(255,255,255,0.05)',
                    fontSize: '0.6rem',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <Layers size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p>Search for Hugging Face {subTab} to get started.</p>
        </div>
      )}
    </div>
  );
}
