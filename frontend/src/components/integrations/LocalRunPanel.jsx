import { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Monitor, Cpu, HardDrive, Zap } from 'lucide-react';
import { runLocal, getLocalStatus } from '../../services/api';
import { useAppStore } from '../../stores/appStore';
import TerminalOutput from './TerminalOutput';
import { io } from 'socket.io-client';
import { WS_URL } from '../../constants/urls';

export default function LocalRunPanel() {
  const addToast = useAppStore(s => s.addToast);
  const terminalOutput = useAppStore(s => s.terminalOutput);
  const appendTerminalOutput = useAppStore(s => s.appendTerminalOutput);
  const clearTerminalOutput = useAppStore(s => s.clearTerminalOutput);
  const isRunning = useAppStore(s => s.isRunningLocal);
  const setIsRunning = useAppStore(s => s.setIsRunningLocal);

  const [code, setCode] = useState(`import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    x = torch.randn(1000, 1000, device='cuda')
    y = torch.matmul(x, x)
    print(f"GPU computation successful! Shape: {y.shape}")
else:
    print("Running on CPU")
    x = torch.randn(1000, 1000)
    y = torch.matmul(x, x)
    print(f"CPU computation successful! Shape: {y.shape}")
`);
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Socket.IO listener for terminal output
  useEffect(() => {
    const socket = io(WS_URL, { path: '/socket.io', transports: ['websocket'] });
    socket.on('connect', () => {
      socket.emit('join', { namespace: '/integrations' });
    });

    // Listen on the default namespace for integration events
    socket.on('terminal_output', (data) => {
      appendTerminalOutput(data);
    });
    socket.on('run_complete', (data) => {
      setIsRunning(false);
      appendTerminalOutput({ type: 'stdout', data: `\n[Process exited with code ${data.returncode}]\n` });
    });

    return () => socket.disconnect();
  }, [appendTerminalOutput, setIsRunning]);

  const handleRun = async () => {
    clearTerminalOutput();
    setIsRunning(true);
    try {
      await runLocal({ code, timeout: 600 });
    } catch (err) {
      addToast('Run failed: ' + (err.response?.data?.error || err.message), 'error');
      setIsRunning(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getLocalStatus();
      setStatus(data);
    } catch (err) {
      addToast('Status check failed: ' + err.message, 'error');
    } finally {
      setLoadingStatus(false);
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
          background: 'rgba(16,185,129,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Monitor size={20} style={{ color: '#34d399' }} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>Local Machine</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Execute Python code directly on your machine. Output streams in real-time.
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
          rows={12}
          disabled={isRunning}
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
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn btn-primary" onClick={handleRun} disabled={isRunning || !code.trim()}>
          {isRunning ? (
            <>
              <RefreshCw size={14} className="spinner" />
              Running…
            </>
          ) : (
            <>
              <Play size={14} />
              Run
            </>
          )}
        </button>

        <button className="btn btn-ghost" onClick={handleCheckStatus} disabled={loadingStatus}>
          {loadingStatus ? <RefreshCw size={14} className="spinner" /> : <Cpu size={14} />}
          System Info
        </button>

        {isRunning && (
          <button className="btn btn-danger" onClick={() => setIsRunning(false)}>
            <Square size={14} />
            Stop
          </button>
        )}
      </div>

      {/* Terminal output */}
      <TerminalOutput lines={terminalOutput} maxHeight="350px" />

      {/* System info card */}
      {status && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Monitor size={16} style={{ color: 'var(--accent-emerald)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>System Resources</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* Platform */}
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <Monitor size={12} style={{ color: 'var(--accent-violet)' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Platform</span>
              </div>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>{status.platform || 'Unknown'}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Python {status.python} • {status.cpu_count} CPUs</p>
            </div>

            {/* GPU */}
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <Zap size={12} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>GPU</span>
              </div>
              {typeof status.gpu === 'object' ? (
                <>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>{status.gpu.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{status.gpu.memory_gb} GB • {status.gpu.count} device(s)</p>
                </>
              ) : (
                <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>{status.gpu || 'N/A'}</p>
              )}
            </div>

            {/* Disk */}
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <HardDrive size={12} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Disk</span>
              </div>
              {typeof status.disk === 'object' ? (
                <>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>{status.disk.free_gb} GB free</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                    {status.disk.used_gb} / {status.disk.total_gb} GB used
                  </p>
                  {/* Usage bar */}
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: '0.4rem' }}>
                    <div style={{
                      height: '100%',
                      width: `${(status.disk.used_gb / status.disk.total_gb * 100).toFixed(0)}%`,
                      background: 'var(--gradient-primary)',
                      borderRadius: 2,
                    }} />
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Unavailable</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
