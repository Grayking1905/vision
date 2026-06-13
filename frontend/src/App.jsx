import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppTopBar from './components/AppTopBar';
import WorkspaceLayout from './components/WorkspaceLayout';
import ToastContainer from './components/shared/ToastContainer';

const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const DataUploadPage = lazy(() => import('./pages/DataUploadPage'));
const DataProcessPage = lazy(() => import('./pages/DataProcessPage'));
const CanvasPage = lazy(() => import('./pages/CanvasPage'));
const TrainingPage = lazy(() => import('./pages/TrainingPage'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading Vision...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-orb bg-orb-violet" />
      <div className="bg-orb bg-orb-cyan" />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppTopBar />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/workspace/:projectId" element={<WorkspaceLayout />}>
              <Route index element={<Navigate to="dataset" replace />} />
              <Route path="dataset" element={<DataUploadPage />} />
              <Route path="process" element={<DataProcessPage />} />
              <Route path="canvas" element={<CanvasPage />} />
              <Route path="training" element={<TrainingPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Suspense>
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}
