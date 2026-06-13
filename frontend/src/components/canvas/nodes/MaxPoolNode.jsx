import { Handle, Position } from 'reactflow';

export default function MaxPoolNode({ data, selected }) {
  const p = data?.params || {};
  return (
    <div className={`vision-node node-maxpool ${selected ? 'selected' : ''}`} style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Top} />
      <div className="vision-node-header"><span>⊟</span> MaxPool2D</div>
      <div className="vision-node-body">
        <div className="vision-node-param"><span>Pool:</span>{p.poolSize ? `${p.poolSize}×${p.poolSize}` : '2×2'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
