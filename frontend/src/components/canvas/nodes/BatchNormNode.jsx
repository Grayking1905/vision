import { Handle, Position } from 'reactflow';

export default function BatchNormNode({ data, selected }) {
  return (
    <div className={`vision-node node-batchnorm ${selected ? 'selected' : ''}`} style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Top} />
      <div className="vision-node-header"><span>≋</span> BatchNorm</div>
      <div className="vision-node-body">
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.7rem' }}>Normalizes activations</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
