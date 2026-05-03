import { create } from 'zustand'

interface AppState {
  isProcessing: boolean;
  documentSummary: string;
  setProcessing: (status: boolean) => void;
  setSummary: (text: string) => void;
}

export const useStore = create<AppState>((set) => ({
  isProcessing: false,
  documentSummary: "",
  setProcessing: (status) => set({ isProcessing: status }),
  setSummary: (text) => set({ documentSummary: text }),
}))