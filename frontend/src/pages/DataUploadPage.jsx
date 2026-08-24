import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Trash2, FileText, Database, Sparkles, Download, Check, HelpCircle, Layers, ArrowRight } from 'lucide-react';
import { getFiles, uploadFile, deleteFile, getSampleDatasets, loadSampleDataset } from '../services/api';
import { useAppStore } from '../stores/appStore';

export default function DataUploadPage() {
  const { projectId } = useParams();
  const { addToast } = useAppStore();
  const [files, setFiles] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchFiles = useCallback(() => {
    getFiles(projectId)
      .then(res => setFiles(res.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
    setLoadingSamples(true);
    getSampleDatasets()
      .then(res => setSamples(res.data || []))
      .catch(() => setSamples([]))
      .finally(() => setLoadingSamples(false));
  }, [fetchFiles]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer?.files || e.target?.files || []);
    if (!dropped.length) return;

    setUploading(true);
    for (const file of dropped) {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('project_id', projectId);
      try {
        await uploadFile(formData);
        addToast(`"${file.name}" uploaded successfully`);
      } catch {
        addToast(`Failed to upload "${file.name}"`, 'error');
      }
    }
    setUploading(false);
    fetchFiles();
  }, [projectId, fetchFiles, addToast]);

  const handleImportSample = async (sample) => {
    setImportingId(sample.id);
    try {
      await loadSampleDataset(sample.id, projectId);
      addToast(`Sample dataset "${sample.name}" imported to project!`);
      fetchFiles();
    } catch {
      addToast(`Failed to import "${sample.name}"`, 'error');
    } finally {
      setImportingId(null);
    }
  };

  const handleDeleteFile = async (id, name) => {
    try {
      await deleteFile(id);
      setFiles(prev => prev.filter(f => f.file_id !== id));
      addToast(`"${name}" deleted`);
    } catch {
      addToast('Failed to delete file', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  // Check if a sample dataset is already imported into the current project/workspace
  const isSampleImported = (filename) => {
    const base = filename.replace(/\.[^/.]+$/, '');
    return files.some(f => f.file_name.toLowerCase() === base.toLowerCase());
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Database size={22} style={{ color: 'var(--accent-cyan)' }} />
          <h2 style={{ color: 'var(--text-primary)' }}>Dataset Management</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: '1.5' }}>
          Upload your custom CSV datasets or ZIP image archives, or import ready-to-train demo benchmark datasets with 1-click.
        </p>
      </div>

      {/* 1-Click Demo Datasets Section */}
      <div className="glass-card-elevated" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={17} style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Demo Benchmark Datasets
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Curated pre-built datasets for classification, regression, and computer vision
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.625rem', borderRadius: '12px' }}>
            {samples.length} Datasets Available
          </span>
        </div>

        {loadingSamples ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {samples.map(sample => {
              const imported = isSampleImported(sample.filename);
              const isImporting = importingId === sample.id;

              return (
                <div
                  key={sample.id}
                  className="glass-card"
                  style={{
                    padding: '1.125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.875rem',
                    borderRadius: 'var(--radius-lg)',
                    border: imported
                      ? '1px solid rgba(16,185,129,0.3)'
                      : '1px solid var(--border-subtle)',
                    background: imported
                      ? 'rgba(16,185,129,0.03)'
                      : 'var(--glass-bg)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {sample.name}
                      </h4>
                      <span className={`badge ${sample.color === 'cyan' ? 'badge-cyan' : sample.color === 'violet' ? 'badge-violet' : 'badge-emerald'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {sample.badge}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                      {sample.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.15)',
                      padding: '0.5rem 0.625rem',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <div><strong>Task:</strong> {sample.task_type}</div>
                      <div>•</div>
                      <div><strong>Rows:</strong> {sample.rows?.toLocaleString()}</div>
                      <div>•</div>
                      <div><strong>Features:</strong> {sample.features}</div>
                      <div style={{ width: '100%', marginTop: '0.2rem' }}>
                        <strong>Target:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{sample.target}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {sample.filename}
                    </span>
                    <button
                      className={`btn btn-sm ${imported ? 'btn-ghost' : 'btn-primary'}`}
                      disabled={isImporting}
                      onClick={() => handleImportSample(sample)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
                    >
                      {isImporting ? (
                        <>
                          <div className="spinner" style={{ width: 12, height: 12 }} />
                          Importing...
                        </>
                      ) : imported ? (
                        <>
                          <Check size={12} style={{ color: 'var(--success)' }} />
                          Re-import
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          Quick Load
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Upload Drop Zone */}
      <div
        className={`dropzone ${dragging ? 'active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.zip"
          multiple
          style={{ display: 'none' }}
          onChange={handleDrop}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
            <p style={{ color: 'var(--accent-violet-light)', fontWeight: 600 }}>Uploading...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(124,58,237,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Upload size={24} style={{ color: 'var(--accent-violet-light)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Drop your custom files here or click to browse
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Supports CSV (tabular datasets) and ZIP (image archive datasets)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Project Files List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner" />
        </div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)' }}>
          <Database size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p style={{ fontWeight: 500 }}>No datasets loaded in this project yet.</p>
          <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Click &quot;Quick Load&quot; on any demo dataset above or upload a CSV to get started.</p>
        </div>
      ) : (
        <div className="glass-card-elevated" style={{ overflow: 'hidden' }}>
          <div className="section-header" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Project Datasets ({files.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Ready for Data Analysis &amp; Neural Canvas Training
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.file_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <FileText size={15} style={{ color: 'var(--accent-violet-light)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {file.file_name}.{file.file_type}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${file.file_type === 'csv' ? 'badge-cyan' : 'badge-violet'}`}>
                        {file.file_type.toUpperCase()}
                      </span>
                    </td>
                    <td>{file.row_count?.toLocaleString() || '—'}</td>
                    <td>
                      {file.fields?.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '320px' }}>
                          {file.fields.slice(0, 4).map(f => (
                            <span key={f} style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-secondary)',
                            }}>{f}</span>
                          ))}
                          {file.fields.length > 4 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{file.fields.length - 4}</span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        title="Delete dataset"
                        onClick={() => setDeleteId({ id: file.file_id, name: `${file.file_name}.${file.file_type}` })}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete File?</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{deleteId.name}</strong> will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteFile(deleteId.id, deleteId.name)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
