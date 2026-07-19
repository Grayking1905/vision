import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Theme state
  theme: localStorage.getItem('vision-theme') || 'dark',
  toggleTheme: () => set(state => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('vision-theme', newTheme);
    return { theme: newTheme };
  }),

  // Current project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Models list (shared across pages)
  modelList: [],
  setModelList: (models) => set({ modelList: models }),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })), 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  // Training state
  trainingLogs: [],
  trainingMetrics: [], // [{epoch, loss, accuracy, val_loss, val_accuracy}]
  isTraining: false,
  setIsTraining: (v) => set({ isTraining: v }),
  addTrainingMetric: (metric) =>
    set(state => ({ trainingMetrics: [...state.trainingMetrics, metric] })),
  // Pretrained State
  pretrainedCatalog: [],
  setPretrainedCatalog: (catalog) => set({ pretrainedCatalog: catalog }),
  loadedModels: [],
  setLoadedModels: (models) => set({ loadedModels: models }),
  selectedPretrained: null,
  setSelectedPretrained: (model) => set({ selectedPretrained: model }),
  fineTuneConfig: {},
  setFineTuneConfig: (config) => set(state => ({ fineTuneConfig: { ...state.fineTuneConfig, ...config } })),
  isFineTuning: false,
  setIsFineTuning: (v) => set({ isFineTuning: v }),
  fineTuneLogs: [],
  fineTuneMetrics: [],
  addFineTuneMetric: (metric) =>
    set(state => ({ fineTuneMetrics: [...state.fineTuneMetrics, metric] })),
  clearFineTune: () => set({ fineTuneLogs: [], fineTuneMetrics: [], isFineTuning: false }),
}));
