import { Handle, Position } from 'reactflow';

export default function FlattenNode({ data, selected }) {
  return (
    <div className={`vision-node node-flatten ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="vision-node-header"><span>≡</span> Flatten</div>
      <div className="vision-node-body">
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.7rem' }}>No parameters</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
