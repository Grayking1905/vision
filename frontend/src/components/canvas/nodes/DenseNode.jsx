import { Handle, Position } from 'reactflow';

export default function DenseNode({ data, selected }) {
  const params = data?.params || {};
  return (
    <div className={`vision-node node-dense ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="vision-node-header">
        <span>◈</span> Dense
      </div>
      <div className="vision-node-body">
        <div className="vision-node-param"><span>Units:</span>{params.units || '?'}</div>
        <div className="vision-node-param"><span>Act:</span>{params.activation || 'relu'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
