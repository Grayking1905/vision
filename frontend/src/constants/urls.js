const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000';

// Projects
export const projects = () => `${API_BASE}/projects`;
export const project = (id) => `${API_BASE}/projects/${id}`;

// Files
export const files = (projectId) =>
  projectId ? `${API_BASE}/files?project_id=${projectId}` : `${API_BASE}/files`;
export const fileUpload = () => `${API_BASE}/files`;
export const fileDelete = (id) => `${API_BASE}/files/${id}`;

// Data Process
export const correlation = (fileId) => `${API_BASE}/data/${fileId}/correlation`;
export const columnStats = (fileId) => `${API_BASE}/data/${fileId}/stats`;
export const dataPreview = (fileId) => `${API_BASE}/data/${fileId}/preview`;
export const setTarget = () => `${API_BASE}/data/target`;
export const preprocessData = () => `${API_BASE}/data/preprocess`;

// Models
export const transpile = () => `${API_BASE}/model/transpile`;
export const saveModel = () => `${API_BASE}/model/save`;
export const updateTrainingConfig = () => `${API_BASE}/model/training-config`;
export const runModel = () => `${API_BASE}/model/run`;
export const downloadCode = () => `${API_BASE}/model/code`;
export const modelList = (projectId) =>
  projectId ? `${API_BASE}/model/list?project_id=${projectId}` : `${API_BASE}/model/list`;
export const modelGraph = (name, projectId) =>
  `${API_BASE}/model/${name}/graph${projectId ? `?project_id=${projectId}` : ''}`;
export const deleteModel = (id) => `${API_BASE}/model/${id}`;
