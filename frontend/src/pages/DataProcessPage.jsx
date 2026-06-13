import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { GitBranch, Info, Loader } from 'lucide-react';
import { getFiles, getCorrelation, getColumnStats } from '../services/api';
import { useAppStore } from '../stores/appStore';

function CorrelationHeatmap({ columns, matrix }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const getColor = (val) => {
    if (val === null || val === undefined) return 'rgba(255,255,255,0.03)';
    const v = parseFloat(val);
    if (v > 0) {
      const intensity = Math.min(v, 1);
      return `rgba(124, 58, 237, ${0.1 + intensity * 0.7})`;
    } else {
      const intensity = Math.min(Math.abs(v), 1);
      return `rgba(6, 182, 212, ${0.1 + intensity * 0.6})`;
    }
  };

  const cellSize = Math.max(28, Math.min(52, Math.floor(560 / columns.length)));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-block', minWidth: '100%' }}>
        {/* Column labels top */}
        <div style={{ display: 'flex', marginLeft: `${cellSize * 3}px`, marginBottom: '4px' }}>
          {columns.map((col) => (
            <div key={col} style={{
              width: cellSize,
              minWidth: cellSize,
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              transform: 'rotate(-30deg)',
              transformOrigin: 'bottom left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              height: 40,
              display: 'flex',
              alignItems: 'flex-end',
              paddingBottom: 4,
            }}>
              {col}
            </div>
          ))}
        </div>

        {matrix.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            {/* Row label */}
            <div style={{
              width: `${cellSize * 3}px`,
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              textAlign: 'right',
              paddingRight: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 0,
            }}>
              {columns[i]}
            </div>
            {row.map((val, j) => {
              const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
              return (
                <div
                  key={j}
                  className="heatmap-cell"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    minWidth: cellSize,
                    background: getColor(val),
                    border: isHovered ? '1px solid rgba(124,58,237,0.8)' : '1px solid rgba(255,255,255,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: cellSize > 38 ? '0.65rem' : '0',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    position: 'relative',
                    cursor: 'default',
                    transition: 'transform 0.1s ease, border-color 0.1s ease',
                  }}
                  onMouseEnter={() => setHoveredCell({ i, j })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`${columns[i]} ↔ ${columns[j]}: ${val !== null ? val.toFixed(3) : 'N/A'}`}
                >
                  {cellSize > 38 && val !== null ? val.toFixed(2) : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 60, height: 12, borderRadius: 4, background: 'linear-gradient(to right, rgba(6,182,212,0.7), rgba(255,255,255,0.05), rgba(124,58,237,0.8))' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-1 (negative) → 0 → +1 (positive)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(124,58,237,0.7)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Positive correlation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(6,182,212,0.6)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Negative correlation</span>
        </div>
      </div>
    </div>
  );
}

export default function DataProcessPage() {
  const { projectId } = useParams();
  const { addToast } = useAppStore();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [correlation, setCorrelation] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingCorr, setLoadingCorr] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState('heatmap');

  useEffect(() => {
    getFiles(projectId)
      .then(res => {
        const csvFiles = (res.data || []).filter(f => f.file_type === 'csv');
        setFiles(csvFiles);
        if (csvFiles.length > 0) setSelectedFile(csvFiles[0].file_id);
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!selectedFile) return;
    setLoadingCorr(true);
    setLoadingStats(true);
    getCorrelation(selectedFile)
      .then(res => setCorrelation(res.data))
      .catch(() => addToast('Failed to compute correlation', 'error'))
      .finally(() => setLoadingCorr(false));
    getColumnStats(selectedFile)
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [selectedFile]);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <GitBranch size={20} style={{ color: 'var(--accent-violet-light)' }} />
            <h2>Data Analysis</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Explore your dataset with interactive visualizations</p>
        </div>
        {files.length > 0 && (
          <select className="select" style={{ width: 'auto', minWidth: 200 }} value={selectedFile} onChange={e => setSelectedFile(e.target.value)}>
            {files.map(f => (
              <option key={f.file_id} value={f.file_id}>{f.file_name}.{f.file_type}</option>
            ))}
          </select>
        )}
      </div>

      {files.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}>
          <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Upload a CSV file first to see data analysis here.</p>
        </div>
      )}

      {selectedFile && (
        <>
          {/* Summary cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Total Rows', value: stats.total_rows?.toLocaleString() },
                { label: 'Total Columns', value: stats.total_cols },
                { label: 'Numeric Cols', value: stats.columns?.filter(c => c.mean !== null).length },
                { label: 'Missing Values', value: stats.columns?.reduce((s, c) => s + c.null_count, 0).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value ?? '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0' }}>
            {['heatmap', 'stats'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-violet-light)' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? '#a78bfa' : 'var(--text-muted)',
                  transition: 'color 0.15s ease',
                }}
              >
                {tab === 'heatmap' ? '🔥 Correlation Heatmap' : '📊 Column Statistics'}
              </button>
            ))}
          </div>

          {/* Heatmap Tab */}
          {activeTab === 'heatmap' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Correlation Matrix</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Shows pairwise Pearson correlations. Violet = positive, Cyan = negative. Hover cells for exact values.
              </p>
              {loadingCorr ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
              ) : correlation?.columns?.length > 0 ? (
                <CorrelationHeatmap columns={correlation.columns} matrix={correlation.matrix} />
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No numeric columns found in this dataset.
                </p>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="glass-card-elevated" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1rem' }}>Column Statistics</h3>
              </div>
              {loadingStats ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th>Type</th>
                        <th>Count</th>
                        <th>Nulls</th>
                        <th>Unique</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Mean</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.columns?.map(col => (
                        <tr key={col.column}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {col.column}
                          </td>
                          <td><span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{col.dtype}</span></td>
                          <td>{col.count?.toLocaleString()}</td>
                          <td>
                            <span style={{ color: col.null_count > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                              {col.null_count}
                            </span>
                          </td>
                          <td>{col.unique}</td>
                          <td className="font-mono">{col.min ?? '—'}</td>
                          <td className="font-mono">{col.max ?? '—'}</td>
                          <td className="font-mono">{col.mean ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
