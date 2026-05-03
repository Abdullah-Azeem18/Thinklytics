// frontend/store/useStore.ts
import { create } from 'zustand'

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isProcessing: boolean;
  setProcessing: (status: boolean) => void;
  // Naye Plan States
  userPlan: 'free' | 'pro' | 'ultra'; 
  setUserPlan: (plan: 'free' | 'pro' | 'ultra') => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'youtube', // Default tab
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  isProcessing: false,
  setProcessing: (status) => set({ isProcessing: status }),
  
  // Default Plan 'free' rakha hai
  userPlan: 'free', 
  setUserPlan: (plan) => set({ userPlan: plan }),
}))