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
export const sampleDatasets = () => `${API_BASE}/files/samples`;
export const loadSampleDataset = () => `${API_BASE}/files/samples/load`;

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

// Pretrained Models
export const pretrainedCatalog = () => `${API_BASE}/pretrained/catalog`;
export const pretrainedLoad = () => `${API_BASE}/pretrained/load`;
export const pretrainedReverseEngineer = (id) => `${API_BASE}/pretrained/${id}/reverse-engineer`;
export const pretrainedSummary = (id) => `${API_BASE}/pretrained/${id}/summary`;
export const pretrainedFineTuneConfig = () => `${API_BASE}/pretrained/fine-tune/config`;
export const pretrainedFineTuneRun = () => `${API_BASE}/pretrained/fine-tune/run`;
export const pretrainedFineTuneCode = () => `${API_BASE}/pretrained/fine-tune/code`;
export const pretrainedList = (projectId) =>
  projectId ? `${API_BASE}/pretrained/list?project_id=${projectId}` : `${API_BASE}/pretrained/list`;
export const pretrainedDelete = (id) => `${API_BASE}/pretrained/${id}`;

// Integrations — Hugging Face
export const hfModels = () => `${API_BASE}/integrations/huggingface/models`;
export const hfDatasets = () => `${API_BASE}/integrations/huggingface/datasets`;
export const hfSpaces = () => `${API_BASE}/integrations/huggingface/spaces`;
export const hfDownload = () => `${API_BASE}/integrations/huggingface/download`;

// Integrations — GitHub
export const ghRepos = () => `${API_BASE}/integrations/github/repos`;
export const ghRepoContents = (owner, repo) => `${API_BASE}/integrations/github/repo/${owner}/${repo}`;
export const ghRepoPush = (owner, repo) => `${API_BASE}/integrations/github/repo/${owner}/${repo}/push`;
export const ghRepoPull = (owner, repo) => `${API_BASE}/integrations/github/repo/${owner}/${repo}/pull`;

// Integrations — Colab
export const colabLaunch = () => `${API_BASE}/integrations/colab/launch`;
export const colabStatus = () => `${API_BASE}/integrations/colab/status`;
export const colabDownload = () => `${API_BASE}/integrations/colab/download`;

// Integrations — Local Runner
export const localRun = () => `${API_BASE}/integrations/local/run`;
export const localStatus = () => `${API_BASE}/integrations/local/status`;

// Integrations — Settings
export const integrationSettings = () => `${API_BASE}/integrations/settings`;

