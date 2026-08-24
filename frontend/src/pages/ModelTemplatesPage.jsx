import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  Cpu,
  Play,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
  Code2,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';
import { MODEL_TEMPLATES } from '../constants/modelTemplates';
import {
  saveModel,
  getFiles,
  loadSampleDataset,
  updateTrainingConfig,
  transpileGraph,
} from '../services/api';
import { useAppStore } from '../stores/appStore';

export default function ModelTemplatesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useAppStore();

  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewCode, setPreviewCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);

  useEffect(() => {
    getFiles(projectId)
      .then((res) => setProjectFiles(res.data || []))
      .catch(() => {});
  }, [projectId]);

  const categories = ['All', 'Classification', 'Healthcare Tabular', 'Business Analytics', 'Regression', 'Computer Vision'];

  const filteredTemplates =
    activeCategory === 'All'
      ? MODEL_TEMPLATES
      : MODEL_TEMPLATES.filter((t) => t.category === activeCategory);

  // Load into Canvas
  const handleLoadCanvas = (template) => {
    try {
      const draftKey = `vision_draft_${projectId || 'default'}`;
      const payload = {
        nodes: template.nodes,
        edges: template.edges,
        modelName: template.id.replace(/_/g, '-'),
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      addToast(`"${template.name}" loaded into Visual Canvas!`);
      navigate(`/workspace/${projectId}/canvas`);
    } catch {
      addToast('Failed to load template into canvas', 'error');
    }
  };

  // 1-Click Save & Train
  const handleQuickTrain = async (template) => {
    setActionLoadingId(template.id);
    try {
      const modelNameClean = `${template.id}_${Date.now().toString().slice(-4)}`;

      // 1. Save model architecture to DB
      const savePayload = {
        model_name: modelNameClean,
        project_id: projectId,
        model: {
          nodes: template.nodes,
          edges: template.edges,
        },
      };
      await saveModel(savePayload);

      // 2. Ensure recommended dataset exists in this project
      let targetFileId = null;
      const existingFile = projectFiles.find(
        (f) =>
          f.file_name.toLowerCase() ===
          template.recommendedDataset.replace(/\.[^/.]+$/, '').toLowerCase()
      );

      if (existingFile) {
        targetFileId = existingFile.file_id;
      } else {
        // Auto-load sample dataset into project
        const loadRes = await loadSampleDataset(template.recommendedDatasetId, projectId);
        targetFileId = loadRes?.data?.file_id;
      }

      // 3. Save training config
      if (targetFileId) {
        await updateTrainingConfig({
          model_name: modelNameClean,
          project_id: projectId,
          file_id: targetFileId,
          target_field: template.recommendedTarget,
          problem_type_id: template.problem_type_id,
          optimizer: template.optimizer || 'adam',
          metric: template.metric || 'accuracy',
          epochs: template.epochs || 15,
          batch_size: template.batch_size || 32,
          training_split: 80,
        });
      }

      addToast(`Model "${modelNameClean}" ready for training!`);
      navigate(`/workspace/${projectId}/training`);
    } catch (err) {
      console.error(err);
      addToast('Failed to configure quick training. Opening canvas instead.', 'error');
      handleLoadCanvas(template);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (template) => {
    setSelectedTemplate(template);
    setLoadingCode(true);
    try {
      const res = await transpileGraph(template.nodes, template.edges);
      setPreviewCode(res.code || '');
    } catch {
      setPreviewCode('# Failed to generate preview code');
    } finally {
      setLoadingCode(false);
    }
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
          <Layers size={24} style={{ color: 'var(--accent-violet-light)' }} />
          <h2 style={{ color: 'var(--text-primary)' }}>Prebuilt Canvas Architectures</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: '1.5' }}>
          Kickstart your machine learning projects with production-grade neural network canvas templates.
          Load any architecture into the visual canvas or launch straight into real-time training.
        </p>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '20px',
              border: activeCategory === cat ? '1px solid var(--accent-violet-light)' : '1px solid var(--border-subtle)',
              background: activeCategory === cat ? 'rgba(124,58,237,0.2)' : 'var(--glass-bg)',
              color: activeCategory === cat ? '#c4b5fd' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: activeCategory === cat ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {filteredTemplates.map((template) => {
          const isBusy = actionLoadingId === template.id;

          return (
            <div
              key={template.id}
              className="glass-card-elevated"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div>
                {/* Top Badge & Title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {template.name}
                  </h3>
                  <span
                    className={`badge ${
                      template.color === 'cyan'
                        ? 'badge-cyan'
                        : template.color === 'violet'
                        ? 'badge-violet'
                        : template.color === 'emerald'
                        ? 'badge-emerald'
                        : 'badge-pink'
                    }`}
                    style={{ fontSize: '0.68rem', flexShrink: 0 }}
                  >
                    {template.badge}
                  </span>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.45' }}>
                  {template.description}
                </p>

                {/* Layer Pipeline Flow */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Layer Pipeline ({template.nodes.length} Nodes)
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                    {template.layersSummary.map((layer, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: idx === 0 ? 'rgba(6,182,212,0.15)' : idx === template.layersSummary.length - 1 ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                            color: idx === 0 ? 'var(--accent-cyan)' : idx === template.layersSummary.length - 1 ? 'var(--accent-violet-light)' : 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {layer}
                        </span>
                        {idx < template.layersSummary.length - 1 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specs Box */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    background: 'rgba(0,0,0,0.18)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Input Shape: </span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{template.inputShape}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Output: </span>
                    <strong style={{ color: 'var(--accent-violet-light)' }}>{template.outputShape}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                    <Database size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Dataset: </span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {template.recommendedDataset}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  paddingTop: '0.875rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleOpenPreview(template)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', gap: '0.35rem' }}
                >
                  <Code2 size={13} />
                  Code
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleLoadCanvas(template)}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
                  >
                    <Cpu size={13} />
                    Open Canvas
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isBusy}
                    onClick={() => handleQuickTrain(template)}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', gap: '0.35rem' }}
                  >
                    {isBusy ? (
                      <>
                        <div className="spinner" style={{ width: 12, height: 12 }} />
                        Configuring...
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        Train Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Code & Architecture Modal */}
      {selectedTemplate && (
        <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '650px', width: '90%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTemplate.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Generated Keras / TensorFlow Python Model Architecture
                </p>
              </div>
              <span className="badge badge-cyan">{selectedTemplate.badge}</span>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              {loadingCode ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: '#a78bfa',
                    overflowX: 'auto',
                    maxHeight: '340px',
                    lineHeight: '1.5',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {previewCode}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedTemplate(null)}>
                Close
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const t = selectedTemplate;
                    setSelectedTemplate(null);
                    handleLoadCanvas(t);
                  }}
                >
                  <Cpu size={14} />
                  Open in Canvas
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const t = selectedTemplate;
                    setSelectedTemplate(null);
                    handleQuickTrain(t);
                  }}
                >
                  <Play size={14} />
                  Start Training
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
