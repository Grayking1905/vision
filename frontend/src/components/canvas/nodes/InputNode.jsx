import { Handle, Position } from 'reactflow';

export default function InputNode({ data, selected }) {
  const params = data?.params || {};
  const dims = [params['dim-1'], params['dim-2'], params['dim-3']].filter(d => d && d !== 0 && d !== '');
  return (
    <div className={`vision-node node-input ${selected ? 'selected' : ''}`} style={{ minWidth: 150 }}>
      <div className="vision-node-header">
        <span style={{ fontSize: '0.875rem' }}>⬡</span>
        Input Layer
      </div>
      <div className="vision-node-body">
        <div className="vision-node-param">
          <span>Shape:</span>
          {dims.length > 0 ? `(${dims.join(', ')})` : <em style={{ color: 'var(--text-muted)' }}>set shape →</em>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
