import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Undo2, Redo2, Trash2, Save, Code2, Cpu, Wand2, LayoutTemplate, Sparkles } from 'lucide-react';
import { MODEL_TEMPLATES } from '../../constants/modelTemplates';

import InputNode from './nodes/InputNode';
import DenseNode from './nodes/DenseNode';
import ConvNode from './nodes/ConvNode';
import FlattenNode from './nodes/FlattenNode';
import DropoutNode from './nodes/DropoutNode';
import MaxPoolNode from './nodes/MaxPoolNode';
import BatchNormNode from './nodes/BatchNormNode';

import NodePropertiesPanel from './NodePropertiesPanel';
import LayerSidebar from './LayerSidebar';
import CodePanel from './CodePanel';
import ModelSummaryPanel from './ModelSummaryPanel';

import { transpileGraph, saveModel, getModelList, getModelGraph } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

const nodeTypes = {
  input: InputNode,
  dense: DenseNode,
  conv: ConvNode,
  flatten: FlattenNode,
  dropout: DropoutNode,
  maxpool: MaxPoolNode,
  batchnorm: BatchNormNode,
};

const DEFAULT_PARAMS = {
  input: { 'dim-1': '', 'dim-2': '', 'dim-3': '' },
  dense: { units: 64, activation: 'relu' },
  conv: { filters: 32, kernelX: 3, kernelY: 3, strideX: 1, strideY: 1, padding: 'valid', activation: 'relu' },
  flatten: {},
  dropout: { rate: 0.5 },
  maxpool: { poolSize: 2 },
  batchnorm: {},
};

export default function CanvasPage() {
  const { projectId } = useParams();
  const { addToast, setModelList } = useAppStore();
  const wrapper = useRef(null);
  // Handle reverse engineered graph load
  useEffect(() => {
    const reParam = new URLSearchParams(window.location.search).get('re');
    if (reParam) {
      const stored = localStorage.getItem('vision-re-graph');
      if (stored) {
        try {
          const { nodes: reNodes, edges: reEdges, modelName } = JSON.parse(stored);
          setNodes(reNodes);
          setEdges(reEdges);
          addToast(`Loaded architecture: ${modelName}`);
          localStorage.removeItem('vision-re-graph');
          // Clear query param
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) {
          console.error('Failed to parse RE graph', e);
        }
      }
    }
  }, []);
  const [rfInstance, setRfInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [modelName, setModelName] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modelSummary, setModelSummary] = useState(null);
  const [showCode, setShowCode] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const draftKey = `vision_draft_${projectId || 'default'}`;
  const isLoaded = useRef(false);

  const handleSelectTemplate = (template) => {
    takeSnapshot();
    setNodes(template.nodes);
    setEdges(template.edges);
    setModelName(template.id.replace(/_/g, '-'));
    setSelectedNodeId(null);
    setShowTemplatesModal(false);
    addToast(`Loaded template: ${template.name}`);
    setTimeout(() => {
      // Trigger layout arrange
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });
      g.setDefaultEdgeLabel(() => ({}));
      template.nodes.forEach(n => g.setNode(n.id, { width: 180, height: 60 }));
      template.edges.forEach(e => g.setEdge(e.source, e.target));
      dagre.layout(g);
      const positioned = template.nodes.map(n => {
        const nodeWithPos = g.node(n.id);
        return {
          ...n,
          position: {
            x: (nodeWithPos?.x ?? 280) - 90,
            y: (nodeWithPos?.y ?? 40) - 30,
          },
        };
      });
      setNodes(positioned);
    }, 50);
  };

  // Live code transpilation — debounced
  useEffect(() => {
    if (!showCode) return;
    setCodeLoading(true);
    const timer = setTimeout(() => {
      const nodeData = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
      const edgeData = edges.map(e => ({ source: e.source, target: e.target, id: e.id }));
      transpileGraph(nodeData, edgeData)
        .then(res => setGeneratedCode(res.code || ''))
        .catch(() => {})
        .finally(() => setCodeLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [nodes, edges, showCode]);

  // Draft persistence
  useEffect(() => {
    if (!isLoaded.current) return;
    const timer = setTimeout(() => {
      try {
        if (nodes.length === 0 && edges.length === 0 && !modelName) {
          localStorage.removeItem(draftKey);
        } else {
          localStorage.setItem(draftKey, JSON.stringify({ nodes, edges, modelName }));
        }
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [nodes, edges, modelName, draftKey]);

  // Load draft on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
        if (draft && (draft.nodes?.length || draft.modelName)) {
          if (!cancelled) {
            setNodes(draft.nodes || []);
            setEdges(draft.edges || []);
            setModelName(draft.modelName || '');
            isLoaded.current = true;
            return;
          }
        }
      } catch {}
      // Try loading from DB
      try {
        const res = await getModelList(projectId);
        if (cancelled || !res.data?.length) { isLoaded.current = true; return; }
        const first = res.data[0];
        const graphRes = await getModelGraph(first.model_name, projectId);
        if (cancelled || !graphRes.success) { isLoaded.current = true; return; }
        const { graph, model_name } = graphRes.data;
        setNodes((graph.nodes || []).map((n, i) => ({
          id: n.id, type: n.type,
          position: n.position || { x: 100, y: i * 200 },
          data: { params: n.data?.params || {} },
        })));
        setEdges((graph.edges || []).map(e => ({ id: e.id || `${e.source}-${e.target}`, source: e.source, target: e.target })));
        setModelName(model_name || '');
        isLoaded.current = true;
      } catch { isLoaded.current = true; }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // Undo/redo
  const takeSnapshot = useCallback(() => {
    setPast(p => { const np = [...p.slice(-49), { nodes, edges }]; return np; });
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    setPast(currentPast => {
      if (!currentPast.length) return currentPast;
      const prev = currentPast[currentPast.length - 1];
      setFuture(f => [{ nodes, edges }, ...f]);
      setNodes(prev.nodes); setEdges(prev.edges);
      return currentPast.slice(0, -1);
    });
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture(currentFuture => {
      if (!currentFuture.length) return currentFuture;
      const next = currentFuture[0];
      setPast(p => [...p.slice(-49), { nodes, edges }]);
      setNodes(next.nodes); setEdges(next.edges);
      return currentFuture.slice(1);
    });
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Shape validation
  const validateEdges = useCallback(() => {
    const getRank = (type) => {
      if (['conv', 'maxpool'].includes(type)) return 3;
      if (['dense', 'flatten'].includes(type)) return 1;
      return null;
    };
    
    setEdges(eds => eds.map(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      if (!sourceNode || !targetNode) return e;
      
      const sRank = getRank(sourceNode.type);
      const tRank = getRank(targetNode.type);
      
      let isError = false;
      if (sRank === 3 && targetNode.type === 'dense') isError = true;
      if (sRank === 1 && tRank === 3) isError = true;

      const style = isError 
        ? { stroke: '#ef4444', strokeWidth: 3, filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' } 
        : { strokeDasharray: '5 5' };

      return { ...e, style, animated: true };
    }));
  }, [nodes, setEdges]);

  useEffect(() => {
    const timer = setTimeout(validateEdges, 200);
    return () => clearTimeout(timer);
  }, [nodes.length, edges.length, validateEdges]);

  // Auto Layout
  const onLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 70, nodesep: 50 });

    nodes.forEach(n => dagreGraph.setNode(n.id, { width: 160, height: 80 }));
    edges.forEach(e => dagreGraph.setEdge(e.source, e.target));

    dagre.layout(dagreGraph);

    takeSnapshot();
    setNodes(nds => nds.map(n => {
      const nodeWithPos = dagreGraph.node(n.id);
      return { ...n, position: { x: nodeWithPos.x - 80, y: nodeWithPos.y - 40 } };
    }));
  }, [nodes, edges, setNodes, takeSnapshot]);

  const onConnect = useCallback((params) => {
    takeSnapshot();
    setEdges(eds => addEdge({ ...params, animated: true, style: { strokeDasharray: '5 5' } }, eds));
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.log('Audio disabled or not supported');
    }
  }, [setEdges, takeSnapshot]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !rfInstance) return;
    const bounds = wrapper.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    takeSnapshot();
    setNodes(nds => [...nds, {
      id: crypto.randomUUID(),
      type,
      position,
      data: { params: { ...DEFAULT_PARAMS[type] } },
    }]);
  }, [rfInstance, setNodes, takeSnapshot]);

  const onNodeUpdate = useCallback((nodeId, params) => {
    takeSnapshot();
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, params } } : n));
  }, [setNodes, takeSnapshot]);

  const handleSave = async () => {
    if (!modelName.trim()) { addToast('Enter a model name first', 'error'); return; }
    if (!nodes.length) { addToast('Add at least one layer', 'error'); return; }
    setSaving(true);
    try {
      const nodeData = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
      const edgeData = edges.map(e => ({ source: e.source, target: e.target }));
      const res = await saveModel({ model: { nodes: nodeData, edges: edgeData }, model_name: modelName, project_id: projectId });
      if (res.success) {
        setModelSummary(res.data?.summary);
        addToast('Model saved successfully!');
        try { localStorage.removeItem(draftKey); } catch {}
        const listRes = await getModelList(projectId);
        setModelList(listRes.data || []);
      } else {
        addToast(res.message || 'Save failed', 'error');
      }
    } catch (err) {
      addToast(err?.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    takeSnapshot();
    setNodes([]); setEdges([]); setModelName(''); setSelectedNodeId(null);
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={20} style={{ color: 'var(--accent-violet-light)' }} />
          <h2>Model Canvas</h2>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowTemplatesModal(true)} title="Load prebuilt architecture template">
            <LayoutTemplate size={14} style={{ color: 'var(--accent-cyan)' }} /> Templates
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!past.length} onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 size={14} /> Undo
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!future.length} onClick={redo} title="Redo (Ctrl+Y)">
            <Redo2 size={14} /> Redo
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!nodes.length} onClick={onLayout} title="Auto-layout graph">
            <Wand2 size={14} /> Magic Layout
          </button>
          <button className="btn btn-danger btn-sm" disabled={!nodes.length} onClick={handleClear}>
            <Trash2 size={14} /> Clear
          </button>
          <button
            className={`btn btn-sm ${showCode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowCode(s => !s)}
          >
            <Code2 size={14} /> {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
      </div>

      {/* Main canvas area */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Left: Layer palette */}
        <LayerSidebar />

        {/* Center: ReactFlow canvas */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            ref={wrapper}
            style={{
              flex: 1,
              minHeight: '460px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'var(--bg-base)',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={changes => {
                if (changes.some(c => c.type === 'remove')) takeSnapshot();
                onNodesChange(changes);
              }}
              onEdgesChange={changes => {
                if (changes.some(c => c.type === 'remove')) takeSnapshot();
                onEdgesChange(changes);
              }}
              onConnect={onConnect}
              onInit={setRfInstance}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              nodeTypes={nodeTypes}
              defaultViewport={{ x: 60, y: 40, zoom: 0.85 }}
              fitView
            >
              <Controls showZoom showFitView showInteractive />
              <MiniMap
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}
                maskColor="rgba(0,0,0,0.6)"
                nodeColor={(n) => {
                  const colors = { input: '#22d3ee', dense: '#a78bfa', conv: '#fbbf24', flatten: '#34d399', dropout: '#fb7185', maxpool: '#fde047', batchnorm: '#c4b5fd' };
                  return colors[n.type] || '#666';
                }}
              />
              <Background variant={BackgroundVariant.Dots} color="rgba(124,58,237,0.15)" gap={20} />
              {nodes.length === 0 && (
                <Panel position="top-center">
                  <div style={{ padding: '0.625rem 1rem', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: '0.8125rem', color: '#a78bfa' }}>
                    ← Drag layers from the palette to start building
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>
        </div>

        {/* Right: Properties + Code */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NodePropertiesPanel
            selectedNode={selectedNode}
            modelName={modelName}
            onModelNameChange={setModelName}
            onSave={handleSave}
            saving={saving}
            canSave={!!modelName.trim() && nodes.length > 0}
            onNodeUpdate={onNodeUpdate}
          />
        </div>
      </div>

      {/* Code panel below canvas */}
      {showCode && (
        <div style={{ marginTop: '1rem', height: '260px' }}>
          <CodePanel code={generatedCode} loading={codeLoading} modelName={modelName} />
        </div>
      )}

      {/* Model summary modal */}
      {modelSummary && <ModelSummaryPanel summary={modelSummary} onClose={() => setModelSummary(null)} />}

      {/* Prebuilt Templates Quick Modal */}
      {showTemplatesModal && (
        <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Prebuilt Architecture Templates
                </h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowTemplatesModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Select an architecture to instantly populate the visual canvas with configured nodes and edges.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '0.875rem',
              overflowY: 'auto',
              maxHeight: '480px',
              paddingRight: '0.25rem',
            }}>
              {MODEL_TEMPLATES.map(t => (
                <div
                  key={t.id}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleSelectTemplate(t)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-violet-light)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.name}
                      </h4>
                      <span className={`badge ${t.color === 'cyan' ? 'badge-cyan' : t.color === 'violet' ? 'badge-violet' : 'badge-emerald'}`} style={{ fontSize: '0.62rem' }}>
                        {t.badge}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', lineHeight: '1.35' }}>
                      {t.description}
                    </p>

                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                      <span>In: <strong style={{ color: 'var(--accent-cyan)' }}>{t.inputShape}</strong></span>
                      <span>•</span>
                      <span>Out: <strong style={{ color: 'var(--accent-violet-light)' }}>{t.outputShape}</strong></span>
                    </div>
                  </div>

                  <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}>
                    Load this Architecture
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
