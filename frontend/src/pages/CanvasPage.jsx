import { ReactFlowProvider } from 'reactflow';
import Canvas from '../components/canvas/Canvas';

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
