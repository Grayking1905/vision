import { useState } from 'react';
import { Settings, X, Eye, EyeOff, Save } from 'lucide-react';
import { updateIntegrationSettings } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

/**
 * Modal for configuring integration API tokens.
 */
export default function IntegrationSettings({ isOpen, onClose }) {
  const tokens = useAppStore(s => s.integrationTokens);
  const setIntegrationTokens = useAppStore(s => s.setIntegrationTokens);
  const addToast = useAppStore(s => s.addToast);

  const [hfToken, setHfToken] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [showHf, setShowHf] = useState(false);
  const [showGh, setShowGh] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (hfToken) payload.huggingface_token = hfToken;
      if (ghToken) payload.github_token = ghToken;

      const result = await updateIntegrationSettings(payload);
      setIntegrationTokens(result);
      addToast('Integration settings saved!', 'success');
      setHfToken('');
      setGhToken('');
      onClose();
    } catch (err) {
      addToast('Failed to save settings: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} style={{ color: 'var(--accent-violet)' }} />
            <h3 style={{ margin: 0 }}>Integration Settings</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Hugging Face Token */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="label">
            Hugging Face Token
            {tokens.huggingface_configured && (
              <span className="badge badge-emerald" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Configured</span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              type={showHf ? 'text' : 'password'}
              placeholder="hf_xxxxxxxxx..."
              value={hfToken}
              onChange={e => setHfToken(e.target.value)}
            />
            <button className="btn btn-ghost btn-icon" onClick={() => setShowHf(!showHf)}>
              {showHf ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Get yours at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>huggingface.co/settings/tokens</a>
          </p>
        </div>

        {/* GitHub Token */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">
            GitHub Personal Access Token
            {tokens.github_configured && (
              <span className="badge badge-emerald" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Configured</span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              type={showGh ? 'text' : 'password'}
              placeholder="ghp_xxxxxxxxx..."
              value={ghToken}
              onChange={e => setGhToken(e.target.value)}
            />
            <button className="btn btn-ghost btn-icon" onClick={() => setShowGh(!showGh)}>
              {showGh ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Create at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>github.com/settings/tokens</a> with repo scope.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!hfToken && !ghToken)}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
