import { create } from 'zustand'

interface UIStore {
    isAISettingsOpen: boolean
    setAISettingsOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
    isAISettingsOpen: false,
    setAISettingsOpen: (open) => set({ isAISettingsOpen: open }),
}))
