import { Handle, Position } from 'reactflow';

export default function DropoutNode({ data, selected }) {
  const p = data?.params || {};
  return (
    <div className={`vision-node node-dropout ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="vision-node-header"><span>⊗</span> Dropout</div>
      <div className="vision-node-body">
        <div className="vision-node-param"><span>Rate:</span>{p.rate !== undefined ? p.rate : '0.5'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
