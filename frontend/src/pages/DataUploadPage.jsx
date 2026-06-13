import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Trash2, FileText, Database, ChevronRight } from 'lucide-react';
import { getFiles, uploadFile, deleteFile } from '../services/api';
import { useAppStore } from '../stores/appStore';

export default function DataUploadPage() {
  const { projectId } = useParams();
  const { addToast } = useAppStore();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchFiles = useCallback(() => {
    getFiles(projectId)
      .then(res => setFiles(res.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

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

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Database size={20} style={{ color: 'var(--accent-cyan)' }} />
          <h2 style={{ color: 'var(--text-primary)' }}>Dataset</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Upload CSV files or image archives (ZIP) to use as training data.
        </p>
      </div>

      {/* Drop Zone */}
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
                Drop files here or click to browse
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Supports CSV (tabular data) and ZIP (image datasets)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner" />
        </div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No files uploaded yet.
        </div>
      ) : (
        <div className="glass-card-elevated" style={{ overflow: 'hidden' }}>
          <div className="section-header" style={{ padding: '1rem 1.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem' }}>Uploaded Files ({files.length})</h3>
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
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '300px' }}>
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

      {/* Delete confirm */}
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
