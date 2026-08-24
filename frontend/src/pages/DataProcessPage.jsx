import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  GitBranch,
  Info,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { getFiles, getCorrelation, getColumnStats } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
            <div
              key={col}
              style={{
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
              }}
            >
              {col}
            </div>
          ))}
        </div>

        {matrix.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            {/* Row label */}
            <div
              style={{
                width: `${cellSize * 3}px`,
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                textAlign: 'right',
                paddingRight: '8px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}
            >
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
                    border: isHovered
                      ? '1px solid rgba(124,58,237,0.8)'
                      : '1px solid rgba(255,255,255,0.03)',
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
                  title={`${columns[i]} ↔ ${columns[j]}: ${
                    val !== null ? val.toFixed(3) : 'N/A'
                  }`}
                >
                  {cellSize > 38 && val !== null ? val.toFixed(2) : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 60,
              height: 12,
              borderRadius: 4,
              background:
                'linear-gradient(to right, rgba(6,182,212,0.7), rgba(255,255,255,0.05), rgba(124,58,237,0.8))',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            -1 (negative) → 0 → +1 (positive)
          </span>
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

function ColumnStatsTable({ columns, totalRows, onViewDistribution }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortField, setSortField] = useState('column');
  const [sortDirection, setSortDirection] = useState('asc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...(columns || [])];

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => c.column.toLowerCase().includes(q));
    }

    // Filter by type
    if (typeFilter === 'Numeric') {
      list = list.filter(c => c.mean !== null);
    } else if (typeFilter === 'Categorical') {
      list = list.filter(c => c.mean === null);
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
    });

    return list;
  }, [columns, searchTerm, typeFilter, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedColumns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.35 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} style={{ color: 'var(--accent-cyan)' }} />
    ) : (
      <ArrowDown size={12} style={{ color: 'var(--accent-cyan)' }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Controls Bar: Search, Type Filter, Page Size */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search column..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ paddingLeft: '2.2rem', fontSize: '0.8125rem' }}
          />
        </div>

        {/* Type Filter Pills & Page Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px' }}>
            {['All', 'Numeric', 'Categorical'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.25rem 0.65rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: typeFilter === t ? 'rgba(124,58,237,0.3)' : 'transparent',
                  color: typeFilter === t ? 'var(--accent-violet-light)' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === t ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <select
            className="select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Statistics Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th onClick={() => handleSort('column')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Column {renderSortIcon('column')}
                </div>
              </th>
              <th onClick={() => handleSort('dtype')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Type {renderSortIcon('dtype')}
                </div>
              </th>
              <th onClick={() => handleSort('count')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Count {renderSortIcon('count')}
                </div>
              </th>
              <th onClick={() => handleSort('null_count')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Nulls {renderSortIcon('null_count')}
                </div>
              </th>
              <th onClick={() => handleSort('unique')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Unique {renderSortIcon('unique')}
                </div>
              </th>
              <th onClick={() => handleSort('mean')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Mean {renderSortIcon('mean')}
                </div>
              </th>
              <th onClick={() => handleSort('std')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Std Dev {renderSortIcon('std')}
                </div>
              </th>
              <th onClick={() => handleSort('min')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Min {renderSortIcon('min')}
                </div>
              </th>
              <th onClick={() => handleSort('max')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Max {renderSortIcon('max')}
                </div>
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedColumns.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No matching columns found.
                </td>
              </tr>
            ) : (
              paginatedColumns.map((col) => {
                const isNumeric = col.mean !== null;
                const nullPct = totalRows ? ((col.null_count / totalRows) * 100).toFixed(1) : 0;

                return (
                  <tr key={col.column}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {col.column}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          col.dtype?.includes('int')
                            ? 'badge-violet'
                            : col.dtype?.includes('float')
                            ? 'badge-cyan'
                            : 'badge-emerald'
                        }`}
                        style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}
                      >
                        {col.dtype}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {col.count?.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {col.null_count === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)' }}>
                          <CheckCircle2 size={13} />
                          <span style={{ fontSize: '0.75rem' }}>0</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b' }}>
                          <AlertTriangle size={13} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {col.null_count} ({nullPct}%)
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{col.unique?.toLocaleString()}</span>
                    </td>
                    <td>
                      <span style={{ color: isNumeric ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {col.mean !== null ? col.mean : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: isNumeric ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {col.std !== null ? col.std : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: isNumeric ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {col.min !== null ? col.min : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: isNumeric ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {col.max !== null ? col.max : '—'}
                      </span>
                    </td>
                    <td>
                      {col.histogram ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onViewDistribution(col.column)}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', gap: '0.25rem' }}
                          title="View distribution histogram"
                        >
                          <BarChart3 size={12} style={{ color: 'var(--accent-violet-light)' }} />
                          Chart
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.5rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Showing {filteredAndSorted.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} columns
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.3rem 0.6rem' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '0.3rem 0.6rem' }}
          >
            <ChevronRight size={14} />
          </button>
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
  const [activeTab, setActiveTab] = useState('stats');
  const [distributionFilter, setDistributionFilter] = useState('');

  useEffect(() => {
    getFiles(projectId)
      .then((res) => {
        const csvFiles = (res.data || []).filter((f) => f.file_type === 'csv');
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
      .then((res) => setCorrelation(res.data))
      .catch(() => addToast('Failed to compute correlation', 'error'))
      .finally(() => setLoadingCorr(false));
    getColumnStats(selectedFile)
      .then((res) => setStats(res.data))
      .catch(() => addToast('Failed to load column statistics', 'error'))
      .finally(() => setLoadingStats(false));
  }, [selectedFile]);

  const handleJumpToDistribution = (columnName) => {
    setDistributionFilter(columnName);
    setActiveTab('distributions');
  };

  const filteredHistograms = useMemo(() => {
    if (!stats?.columns) return [];
    let cols = stats.columns.filter((c) => c.histogram);
    if (distributionFilter.trim()) {
      cols = cols.filter((c) =>
        c.column.toLowerCase().includes(distributionFilter.toLowerCase())
      );
    }
    return cols;
  }, [stats, distributionFilter]);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <GitBranch size={20} style={{ color: 'var(--accent-violet-light)' }} />
            <h2>Data Analysis &amp; Statistics</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Explore column statistics, correlation heatmaps, and distribution charts for your dataset.
          </p>
        </div>
        {files.length > 0 && (
          <select
            className="select"
            style={{ width: 'auto', minWidth: 220 }}
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            {files.map((f) => (
              <option key={f.file_id} value={f.file_id}>
                {f.file_name}.{f.file_type} ({f.row_count?.toLocaleString() || '—'} rows)
              </option>
            ))}
          </select>
        )}
      </div>

      {files.length === 0 && (
        <div
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--glass-bg)',
            border: '1px dashed var(--glass-border)',
          }}
        >
          <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No Datasets Available
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Upload a CSV dataset or import a demo dataset from the <strong>Dataset</strong> page first.
          </p>
        </div>
      )}

      {selectedFile && (
        <>
          {/* Summary Metric Cards */}
          {stats && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
              }}
            >
              {[
                { label: 'Total Rows', value: stats.total_rows?.toLocaleString() },
                { label: 'Total Columns', value: stats.total_cols },
                {
                  label: 'Numeric Columns',
                  value: stats.columns?.filter((c) => c.mean !== null).length,
                },
                {
                  label: 'Missing Values',
                  value: stats.columns
                    ?.reduce((s, c) => s + c.null_count, 0)
                    .toLocaleString(),
                },
              ].map(({ label, value }) => (
                <div key={label} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {value ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0',
            }}
          >
            {[
              { id: 'stats', label: '📊 Column Statistics' },
              { id: 'heatmap', label: '🔥 Correlation Heatmap' },
              { id: 'distributions', label: '📈 Feature Distributions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.id
                      ? '2px solid var(--accent-violet-light)'
                      : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? '#a78bfa' : 'var(--text-muted)',
                  transition: 'color 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Column Statistics Table */}
          {activeTab === 'stats' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Dataset Column Summary
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Detailed summary metrics, data types, missing counts, central tendencies, and dispersions.
                </p>
              </div>

              {loadingStats ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
              ) : stats?.columns?.length > 0 ? (
                <ColumnStatsTable
                  columns={stats.columns}
                  totalRows={stats.total_rows}
                  onViewDistribution={handleJumpToDistribution}
                />
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No columns found for this dataset.
                </p>
              )}
            </div>
          )}

          {/* Tab 2: Correlation Heatmap */}
          {activeTab === 'heatmap' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
                Correlation Matrix
              </h3>
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

          {/* Tab 3: Feature Distributions */}
          {activeTab === 'distributions' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Feature Distribution Histograms
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Binned frequency counts for numeric variables in the selected dataset.
                  </p>
                </div>
                {stats?.columns?.some((c) => c.histogram) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Filter histograms..."
                      value={distributionFilter}
                      onChange={(e) => setDistributionFilter(e.target.value)}
                      style={{ width: '200px', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                    />
                    {distributionFilter && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDistributionFilter('')}
                        style={{ fontSize: '0.75rem' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {loadingStats ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {filteredHistograms.map((col) => (
                    <div
                      key={col.column}
                      className="glass-card"
                      style={{
                        padding: '1.125rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {col.column}
                        </span>
                        <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                          μ: {col.mean} | σ: {col.std ?? '—'}
                        </span>
                      </div>

                      <div style={{ height: 200, width: '100%' }}>
                        <ResponsiveContainer>
                          <BarChart data={col.histogram} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <XAxis
                              dataKey="bin"
                              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                              angle={-25}
                              textAnchor="end"
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(16,16,31,0.95)',
                                border: '1px solid var(--border-medium)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                              }}
                              itemStyle={{ color: '#c4b5fd' }}
                            />
                            <Bar
                              dataKey="count"
                              fill="var(--accent-violet-light)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                  {filteredHistograms.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
                      {distributionFilter
                        ? `No numeric histograms matching "${distributionFilter}".`
                        : 'No numeric columns available for distribution.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
