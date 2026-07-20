import { useState, useEffect } from 'react';
import { Plug, Layers, GitBranch, Cloud, Monitor, Settings } from 'lucide-react';
import { getIntegrationSettings } from '../services/api';
import { useAppStore } from '../stores/appStore';
import HuggingFacePanel from '../components/integrations/HuggingFacePanel';
import GitHubPanel from '../components/integrations/GitHubPanel';
import ColabPanel from '../components/integrations/ColabPanel';
import LocalRunPanel from '../components/integrations/LocalRunPanel';
import IntegrationSettings from '../components/integrations/IntegrationSettings';
import './IntegrationsPage.css';

const TABS = [
  { key: 'huggingface', label: 'Hugging Face', icon: Layers, color: '#fbbf24' },
  { key: 'github', label: 'GitHub', icon: GitBranch, color: '#a78bfa' },
  { key: 'colab', label: 'Google Colab', icon: Cloud, color: '#fbbf24' },
  { key: 'local', label: 'Local Machine', icon: Monitor, color: '#34d399' },
];

export default function IntegrationsPage() {
  const setIntegrationTokens = useAppStore(s => s.setIntegrationTokens);
  const [activeTab, setActiveTab] = useState('huggingface');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch token status on mount
  useEffect(() => {
    getIntegrationSettings()
      .then(data => setIntegrationTokens(data))
      .catch(() => {});
  }, [setIntegrationTokens]);

  const renderPanel = () => {
    switch (activeTab) {
      case 'huggingface': return <HuggingFacePanel />;
      case 'github': return <GitHubPanel />;
      case 'colab': return <ColabPanel />;
      case 'local': return <LocalRunPanel />;
      default: return null;
    }
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Plug size={22} style={{ color: 'var(--accent-violet)' }} />
            <h2 style={{ margin: 0 }}>Integrations</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Connect with Hugging Face, GitHub, Google Colab, and your local machine.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Tab navigation */}
      <div className="integrations-tabs">
        {TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            className={`integration-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <div className="integration-tab-icon">
              <Icon size={16} style={{ color: activeTab === key ? 'white' : color }} />
            </div>
            {label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div className="integration-panel" key={activeTab}>
        {renderPanel()}
      </div>

      {/* Settings modal */}
      <IntegrationSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
