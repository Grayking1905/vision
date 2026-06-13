import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
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
  clearTraining: () => set({ trainingLogs: [], trainingMetrics: [], isTraining: false }),
}));
