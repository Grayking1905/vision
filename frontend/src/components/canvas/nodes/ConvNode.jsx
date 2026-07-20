import { Handle, Position } from 'reactflow';

export default function ConvNode({ data, selected }) {
  const p = data?.params || {};
  return (
    <div className={`vision-node node-conv ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="vision-node-header"><span>⊞</span> Conv2D</div>
      <div className="vision-node-body">
        <div className="vision-node-param"><span>Filters:</span>{p.filters || '?'}</div>
        <div className="vision-node-param"><span>Kernel:</span>{p.kernelX && p.kernelY ? `${p.kernelX}×${p.kernelY}` : '?×?'}</div>
        <div className="vision-node-param"><span>Stride:</span>{p.strideX && p.strideY ? `${p.strideX}×${p.strideY}` : '1×1'}</div>
        <div className="vision-node-param"><span>Pad:</span>{p.padding || 'valid'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
