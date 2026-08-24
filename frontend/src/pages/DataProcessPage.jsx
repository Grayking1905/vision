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
  Image as ImageIcon,
  Layers,
  Sparkles,
  Maximize2,
  X,
  FileArchive,
  Grid,
} from 'lucide-react';
import { getFiles, getCorrelation, getColumnStats } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const cellSize = Math.max(28, Math.min(52, Math.floor(560 / (columns?.length || 1))));

  if (!columns || columns.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No numeric columns available for correlation heatmap.
      </div>
    );
  }

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
                    fontSize: '0.6rem',
                    color:
                      val !== null && Math.abs(parseFloat(val)) > 0.4
                        ? '#fff'
                        : 'var(--text-muted)',
                    cursor: 'pointer',
                    borderRadius: 2,
                    margin: '1px',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    transform: isHovered ? 'scale(1.15)' : 'none',
                    zIndex: isHovered ? 10 : 1,
                  }}
                  onMouseEnter={() => setHoveredCell({ i, j, val, x: columns[j], y: columns[i] })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {cellSize >= 40 && val !== null ? parseFloat(val).toFixed(2) : ''}
                </div>
              );
            })}
          </div>
        ))}

        {hoveredCell && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(16,16,31,0.9)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              fontSize: '0.8rem',
              display: 'inline-flex',
              gap: '1rem',
            }}
          >
            <span>
              <strong>{hoveredCell.y}</strong> vs <strong>{hoveredCell.x}</strong>
            </span>
            <span style={{ color: 'var(--accent-violet-light)' }}>
              Correlation: <strong>{hoveredCell.val ?? 'N/A'}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnStatsTable({ columns, onJumpToDistribution }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState('column');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredColumns = useMemo(() => {
    if (!columns) return [];
    return columns.filter((col) => {
      const matchesSearch = col.column.toLowerCase().includes(searchTerm.toLowerCase());
      const isNum = col.mean !== null;
      if (typeFilter === 'NUMERIC') return matchesSearch && isNum;
      if (typeFilter === 'CATEGORICAL') return matchesSearch && !isNum;
      return matchesSearch;
    });
  }, [columns, searchTerm, typeFilter]);

  const sortedColumns = useMemo(() => {
    return [...filteredColumns].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredColumns, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedColumns.length / pageSize) || 1;
  const paginatedColumns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedColumns.slice(start, start + pageSize);
  }, [sortedColumns, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Controls: Search, Type Filter, Page Size */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
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
              className="input input-sm"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: '2.25rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
            {['ALL', 'NUMERIC', 'CATEGORICAL'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  background: typeFilter === t ? 'var(--accent-violet)' : 'transparent',
                  color: typeFilter === t ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.6875rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                  fontWeight: typeFilter === t ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Rows per page:</span>
          <select
            className="select select-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Glassmorphism Table */}
      <div
        style={{
          overflowX: 'auto',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(10, 10, 20, 0.4)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Column Name', field: 'column', width: '22%' },
                { label: 'Data Type', field: 'dtype', width: '10%' },
                { label: 'Non-Null Count', field: 'count', width: '12%' },
                { label: 'Nulls', field: 'null_count', width: '10%' },
                { label: 'Unique', field: 'unique', width: '10%' },
                { label: 'Mean', field: 'mean', width: '9%' },
                { label: 'Std Dev', field: 'std', width: '9%' },
                { label: 'Median', field: 'median', width: '9%' },
                { label: 'Distribution', field: null, width: '9%' },
              ].map(({ label, field, width }) => (
                <th
                  key={label}
                  onClick={() => field && handleSort(field)}
                  style={{
                    padding: '0.625rem 0.875rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: field ? 'pointer' : 'default',
                    userSelect: 'none',
                    width,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{label}</span>
                    {field && getSortIcon(field)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedColumns.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No columns matching criteria
                </td>
              </tr>
            ) : (
              paginatedColumns.map((col) => {
                const isNum = col.mean !== null;
                return (
                  <tr
                    key={col.column}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.625rem 0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {col.column}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.65rem',
                          background: isNum ? 'rgba(124, 58, 237, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                          color: isNum ? 'var(--accent-violet-light)' : 'var(--accent-cyan)',
                          border: isNum ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(6,182,212,0.3)',
                        }}
                      >
                        {col.dtype}
                      </span>
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text-secondary)' }}>
                      {col.count.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      {col.null_count > 0 ? (
                        <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <AlertTriangle size={11} />
                          {col.null_count}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={11} /> 0
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text-secondary)' }}>
                      {col.unique.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', color: isNum ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {col.mean !== null ? col.mean : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', color: isNum ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {col.std !== null ? col.std : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', color: isNum ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {col.median !== null ? col.median : '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      {col.histogram ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onJumpToDistribution(col.column)}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.4rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          <BarChart3 size={11} />
                          Chart
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
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
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          padding: '0.25rem 0.5rem',
        }}
      >
        <div>
          Showing {sortedColumns.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sortedColumns.length)} of {sortedColumns.length} columns
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

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
  const [selectedImageClass, setSelectedImageClass] = useState('ALL');
  const [previewImageModal, setPreviewImageModal] = useState(null);

  useEffect(() => {
    getFiles(projectId)
      .then((res) => {
        const validFiles = (res.data || []).filter((f) => f.file_type === 'csv' || f.file_type === 'zip');
        setFiles(validFiles);
        if (validFiles.length > 0) setSelectedFile(validFiles[0].file_id);
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

  const selectedFileObj = files.find((f) => f.file_id === selectedFile);
  const isZipDataset = selectedFileObj?.file_type === 'zip' || stats?.dataset_type === 'image_zip';

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

  const filteredImagePreviews = useMemo(() => {
    if (!stats?.sample_previews) return [];
    if (selectedImageClass === 'ALL') return stats.sample_previews;
    return stats.sample_previews.filter((img) => img.class_name === selectedImageClass);
  }, [stats, selectedImageClass]);

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
            {isZipDataset ? (
              <FileArchive size={22} style={{ color: 'var(--accent-cyan)' }} />
            ) : (
              <GitBranch size={22} style={{ color: 'var(--accent-violet-light)' }} />
            )}
            <h2>Data Analysis &amp; Statistics</h2>
            {isZipDataset && (
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                🖼️ Image Dataset (ZIP)
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {isZipDataset
              ? 'Inspect image classes, category balance, visual gallery thumbnails, and resolution metrics.'
              : 'Explore column statistics, correlation heatmaps, and distribution charts for your tabular dataset.'}
          </p>
        </div>

        {files.length > 0 && (
          <select
            className="select"
            style={{ width: 'auto', minWidth: 260 }}
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            {files.map((f) => (
              <option key={f.file_id} value={f.file_id}>
                {f.file_name}.{f.file_type} {f.file_type === 'zip' ? '🖼️ (Image Archive)' : `(${f.row_count?.toLocaleString() || '—'} rows)`}
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
            Upload a CSV / ZIP image dataset or import a demo dataset from the <strong>Dataset</strong> page first.
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
              {isZipDataset
                ? [
                    { label: 'Total Images', value: stats.total_images?.toLocaleString() },
                    { label: 'Class Categories', value: stats.total_classes },
                    {
                      label: 'Color Mode',
                      value: stats.color_modes?.join(', ') || 'RGB',
                    },
                    {
                      label: 'Sample Resolution',
                      value: stats.resolutions?.join(', ') || '64×64',
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
                  ))
                : [
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
              paddingBottom: '0.5rem',
            }}
          >
            {isZipDataset ? (
              <>
                <button
                  className={`btn btn-sm ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('stats')}
                >
                  <Grid size={14} />
                  Image Gallery ({stats?.sample_previews?.length || 0})
                </button>
                <button
                  className={`btn btn-sm ${activeTab === 'distributions' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('distributions')}
                >
                  <BarChart3 size={14} />
                  Class Distribution ({stats?.total_classes || 0} Classes)
                </button>
              </>
            ) : (
              <>
                <button
                  className={`btn btn-sm ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('stats')}
                >
                  <BarChart3 size={14} />
                  Column Statistics
                </button>
                <button
                  className={`btn btn-sm ${activeTab === 'correlation' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('correlation')}
                >
                  <GitBranch size={14} />
                  Correlation Heatmap
                </button>
                <button
                  className={`btn btn-sm ${activeTab === 'distributions' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('distributions')}
                >
                  <BarChart3 size={14} />
                  Distributions
                </button>
              </>
            )}
          </div>

          {/* ── ZIP DATASET: Image Gallery Tab ─────────────────────────── */}
          {isZipDataset && activeTab === 'stats' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Class Filter Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Class:</span>
                  <button
                    onClick={() => setSelectedImageClass('ALL')}
                    className={`btn btn-sm ${selectedImageClass === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    All ({stats?.sample_previews?.length || 0})
                  </button>
                  {stats?.classes?.map((cls) => (
                    <button
                      key={cls.class_name}
                      onClick={() => setSelectedImageClass(cls.class_name)}
                      className={`btn btn-sm ${selectedImageClass === cls.class_name ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      {cls.class_name} ({cls.count})
                    </button>
                  ))}
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Showing {filteredImagePreviews.length} sample thumbnails
                </span>
              </div>

              {/* Gallery Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '1rem',
                }}
              >
                {filteredImagePreviews.map((img, idx) => (
                  <div
                    key={idx}
                    className="glass-card"
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                    }}
                    onClick={() => setPreviewImageModal(img)}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: 120,
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {img.thumbnail_b64 ? (
                        <img
                          src={img.thumbnail_b64}
                          alt={img.filename}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <ImageIcon size={32} style={{ opacity: 0.3 }} />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          right: 4,
                          top: 4,
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: 4,
                          padding: 3,
                          display: 'flex',
                        }}
                      >
                        <Maximize2 size={11} style={{ color: '#fff' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span
                          className="badge badge-emerald"
                          style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem' }}
                        >
                          {img.class_name}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {img.dimensions}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {img.filename}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ZIP DATASET: Class Distribution Tab ────────────────────── */}
          {isZipDataset && activeTab === 'distributions' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Image Count per Class</h3>
                <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
                  ✓ Balanced Dataset
                </span>
              </div>

              {stats?.classes && (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.classes} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <XAxis dataKey="class_name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(16,16,31,0.95)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 6,
                      }}
                      formatter={(val) => [`${val} Images`, 'Sample Count']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.classes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Breakdown Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.625rem 0.875rem', color: 'var(--text-secondary)' }}>Class Category</th>
                      <th style={{ padding: '0.625rem 0.875rem', color: 'var(--text-secondary)' }}>Image Count</th>
                      <th style={{ padding: '0.625rem 0.875rem', color: 'var(--text-secondary)' }}>Share (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.classes?.map((c) => (
                      <tr key={c.class_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.625rem 0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.class_name}
                        </td>
                        <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text-secondary)' }}>
                          {c.count.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.875rem', color: 'var(--accent-cyan)' }}>
                          {c.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TABULAR CSV DATASET: Column Statistics Tab ──────────────── */}
          {!isZipDataset && activeTab === 'stats' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} style={{ color: 'var(--accent-violet-light)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Column Statistics ({stats?.columns?.length || 0} Columns)
                  </h3>
                </div>
              </div>

              {loadingStats ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem', width: 24, height: 24 }} />
                  Computing statistics...
                </div>
              ) : stats?.columns ? (
                <ColumnStatsTable
                  columns={stats.columns}
                  onJumpToDistribution={handleJumpToDistribution}
                />
              ) : null}
            </div>
          )}

          {/* ── TABULAR CSV DATASET: Correlation Heatmap Tab ────────────── */}
          {!isZipDataset && activeTab === 'correlation' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <GitBranch size={18} style={{ color: 'var(--accent-violet-light)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Feature Correlation Heatmap
                </h3>
              </div>

              {loadingCorr ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem', width: 24, height: 24 }} />
                  Computing correlation matrix...
                </div>
              ) : correlation?.columns?.length > 0 ? (
                <CorrelationHeatmap columns={correlation.columns} matrix={correlation.matrix} />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No numeric columns available to compute correlation.
                </p>
              )}
            </div>
          )}

          {/* ── TABULAR CSV DATASET: Distributions Tab ─────────────────── */}
          {!isZipDataset && activeTab === 'distributions' && (
            <div className="glass-card-elevated" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} style={{ color: 'var(--accent-cyan)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Column Distributions &amp; Histograms
                  </h3>
                </div>

                <div style={{ position: 'relative', width: 240 }}>
                  <Filter
                    size={13}
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
                    className="input input-sm"
                    placeholder="Filter distribution..."
                    value={distributionFilter}
                    onChange={(e) => setDistributionFilter(e.target.value)}
                    style={{ paddingLeft: '2rem', width: '100%' }}
                  />
                </div>
              </div>

              {filteredHistograms.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                  No histograms available for the filtered columns.
                </p>
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
                      style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {col.column}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Mean: {col.mean ?? 'N/A'}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={col.histogram} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(16,16,31,0.95)',
                              border: '1px solid var(--border-medium)',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                            }}
                          />
                          <Bar dataKey="count" fill="var(--accent-violet)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Image Preview Modal */}
      {previewImageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="glass-card-elevated"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-emerald">{previewImageModal.class_name}</span>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{previewImageModal.filename}</h4>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPreviewImageModal(null)}
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                width: '100%',
                height: 280,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={previewImageModal.thumbnail_b64}
                alt={previewImageModal.filename}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div><strong>Dimensions:</strong> {previewImageModal.dimensions}</div>
              <div><strong>Format:</strong> {previewImageModal.format}</div>
              <div><strong>Path:</strong> {previewImageModal.path}</div>
              <div><strong>Mode:</strong> {previewImageModal.mode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
