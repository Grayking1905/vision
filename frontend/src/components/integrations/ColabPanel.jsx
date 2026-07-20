import { useState } from 'react';
import { Play, Download, RefreshCw, Cloud, Cpu, Zap } from 'lucide-react';
import { launchColab, getColabStatus, downloadColabNotebook } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

export default function ColabPanel() {
  const addToast = useAppStore(s => s.addToast);

  const [code, setCode] = useState(`import torch
import torchvision.models as models

# Load a pretrained ResNet model
model = models.resnet18(pretrained=True)
model.eval()

# Create a dummy input
x = torch.randn(1, 3, 224, 224)
output = model(x)
print(f"Output shape: {output.shape}")
print(f"Top-5 predictions: {torch.topk(output, 5).indices}")
`);
  const [notebookPath, setNotebookPath] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [status, setStatus] = useState(null);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const result = await launchColab({ code, notebook_name: 'vision_generated' });
      setNotebookPath(result.notebook_path);
      addToast('Notebook generated! Download and upload to Google Colab.', 'success');
    } catch (err) {
      addToast('Launch failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLaunching(false);
    }
  };

  const handleDownload = async () => {
    if (!notebookPath) return;
    try {
      await downloadColabNotebook(notebookPath);
      addToast('Notebook downloaded!', 'success');
    } catch (err) {
      addToast('Download failed: ' + err.message, 'error');
    }
  };

  const handleCheckStatus = async () => {
    try {
      const data = await getColabStatus();
      setStatus(data);
    } catch (err) {
      addToast('Status check failed: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Info banner */}
      <div style={{
        padding: '1rem',
        background: 'var(--gradient-card)',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(245,158,11,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Cloud size={20} style={{ color: '#fbbf24' }} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>Google Colab</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Generate a Jupyter notebook from your model code and run it on Google Colab with free GPU access.
          </p>
        </div>
      </div>

      {/* Code editor */}
      <div>
        <label className="label">Python Code</label>
        <textarea
          className="input"
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={14}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            resize: 'vertical',
            background: '#0a0a12',
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleLaunch} disabled={launching || !code.trim()}>
          {launching ? <RefreshCw size={14} className="spinner" /> : <Play size={14} />}
          Generate Notebook
        </button>

        {notebookPath && (
          <button className="btn btn-ghost" onClick={handleDownload}>
            <Download size={14} />
            Download .ipynb
          </button>
        )}

        <a
          href="https://colab.research.google.com/#create=true"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          style={{ textDecoration: 'none' }}
        >
          <Cloud size={14} />
          Open Colab
        </a>

        <button className="btn btn-ghost" onClick={handleCheckStatus}>
          <Cpu size={14} />
          Check Status
        </button>
      </div>

      {/* Runtime status card */}
      {status && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Zap size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Runtime Status</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span className={`badge ${status.runtime === 'connected' ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                {status.runtime || 'not_connected'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>GPU: </span>
              <span>{status.gpu || 'N/A'}</span>
            </div>
          </div>
          {status.tip && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{status.tip}</p>
          )}
        </div>
      )}
    </div>
  );
}
