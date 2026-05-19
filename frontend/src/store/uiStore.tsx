import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  darkMode: boolean;
  uploadOpen: boolean;
  toggleDarkMode: () => void;
  setUploadOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches,
      uploadOpen: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setUploadOpen: (v) => set({ uploadOpen: v }),
    }),
    { name: "pdf-chat-ui" },
  ),
);
