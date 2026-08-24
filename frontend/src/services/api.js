import axios from 'axios';
import * as urls from '../constants/urls';

const api = axios.create({ timeout: 60000 });

// Projects
export const getProjects = () => api.get(urls.projects()).then(r => r.data);
export const createProject = (data) => api.post(urls.projects(), data).then(r => r.data);
export const deleteProject = (id) => api.delete(urls.project(id)).then(r => r.data);

// Files
export const getFiles = (projectId) => api.get(urls.files(projectId)).then(r => r.data);
export const uploadFile = (formData) =>
  api.post(urls.fileUpload(), formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const deleteFile = (id) => api.delete(urls.fileDelete(id)).then(r => r.data);
export const getSampleDatasets = () => api.get(urls.sampleDatasets()).then(r => r.data);
export const loadSampleDataset = (sampleId, projectId) =>
  api.post(urls.loadSampleDataset(), { sample_id: sampleId, project_id: projectId }).then(r => r.data);

// Data Process
export const getCorrelation = (fileId) => api.get(urls.correlation(fileId)).then(r => r.data);
export const getColumnStats = (fileId) => api.get(urls.columnStats(fileId)).then(r => r.data);
export const getPreview = (fileId) => api.get(urls.dataPreview(fileId)).then(r => r.data);
export const setTarget = (data) => api.post(urls.setTarget(), data).then(r => r.data);
export const preprocess = (data) => api.post(urls.preprocessData(), data).then(r => r.data);

// Models
export const transpileGraph = (nodes, edges) =>
  api.post(urls.transpile(), { nodes, edges }).then(r => r.data);
export const saveModel = (data) => api.post(urls.saveModel(), data).then(r => r.data);
export const updateTrainingConfig = (data) =>
  api.patch(urls.updateTrainingConfig(), data).then(r => r.data);
export const runModel = (modelName, projectId) =>
  api.post(urls.runModel(), { model_name: modelName, project_id: projectId }).then(r => r.data);
export const downloadCode = (modelName, projectId) =>
  api.post(urls.downloadCode(), { model_name: modelName, project_id: projectId }, { responseType: 'blob' })
    .then(r => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(r.data);
      link.download = `${modelName}.py`;
      link.click();
    });
export const getModelList = (projectId) => api.get(urls.modelList(projectId)).then(r => r.data);
export const getModelGraph = (name, projectId) =>
  api.get(urls.modelGraph(name, projectId)).then(r => r.data);
export const deleteModelById = (id) => api.delete(urls.deleteModel(id)).then(r => r.data);

// Pretrained Models
export const getPretrainedCatalog = () => api.get(urls.pretrainedCatalog()).then(r => r.data);
export const loadPretrained = (data) => api.post(urls.pretrainedLoad(), data).then(r => r.data);
export const reverseEngineer = (id) => api.get(urls.pretrainedReverseEngineer(id)).then(r => r.data);
export const getPretrainedSummary = (id) => api.get(urls.pretrainedSummary(id)).then(r => r.data);
export const saveFineTuneConfig = (data) => api.patch(urls.pretrainedFineTuneConfig(), data).then(r => r.data);
export const runFineTune = (pretrainedId, projectId) =>
  api.post(urls.pretrainedFineTuneRun(), { pretrained_id: pretrainedId, project_id: projectId }).then(r => r.data);
export const generateFineTuneCode = (pretrainedId, projectId) =>
  api.post(urls.pretrainedFineTuneCode(), { pretrained_id: pretrainedId, project_id: projectId }, { responseType: 'blob' })
    .then(r => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(r.data);
      link.download = `finetune_model.py`;
      link.click();
    });
export const getLoadedModels = (projectId) => api.get(urls.pretrainedList(projectId)).then(r => r.data);
export const deleteLoadedModel = (id) => api.delete(urls.pretrainedDelete(id)).then(r => r.data);

// ── Integration Connectors ──────────────────────────────────────────────

// Hugging Face
export const searchHFModels = (query, limit, sort) =>
  api.get(urls.hfModels(), { params: { query, limit, sort } }).then(r => r.data);
export const searchHFDatasets = (query, limit, sort) =>
  api.get(urls.hfDatasets(), { params: { query, limit, sort } }).then(r => r.data);
export const searchHFSpaces = (query, limit, sort) =>
  api.get(urls.hfSpaces(), { params: { query, limit, sort } }).then(r => r.data);
export const downloadHFRepo = (data) =>
  api.post(urls.hfDownload(), data).then(r => r.data);

// GitHub
export const getGHRepos = (perPage, page) =>
  api.get(urls.ghRepos(), { params: { per_page: perPage, page } }).then(r => r.data);
export const getGHRepoContents = (owner, repo, path) =>
  api.get(urls.ghRepoContents(owner, repo), { params: { path } }).then(r => r.data);
export const pushToGHRepo = (owner, repo, data) =>
  api.post(urls.ghRepoPush(owner, repo), data).then(r => r.data);
export const pullGHRepo = (owner, repo, data) =>
  api.post(urls.ghRepoPull(owner, repo), data).then(r => r.data);

// Colab
export const launchColab = (data) =>
  api.post(urls.colabLaunch(), data).then(r => r.data);
export const getColabStatus = () =>
  api.get(urls.colabStatus()).then(r => r.data);
export const downloadColabNotebook = (notebookPath) =>
  api.get(urls.colabDownload(), { params: { notebook_path: notebookPath }, responseType: 'blob' })
    .then(r => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(r.data);
      link.download = 'vision_notebook.ipynb';
      link.click();
    });

// Local Runner
export const runLocal = (data) =>
  api.post(urls.localRun(), data).then(r => r.data);
export const getLocalStatus = () =>
  api.get(urls.localStatus()).then(r => r.data);

// Integration Settings
export const getIntegrationSettings = () =>
  api.get(urls.integrationSettings()).then(r => r.data);
export const updateIntegrationSettings = (data) =>
  api.put(urls.integrationSettings(), data).then(r => r.data);

