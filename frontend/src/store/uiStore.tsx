import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Citation } from "@/types/api";

interface UiState {
  darkMode: boolean;
  uploadOpen: boolean;
  activeCitation: Citation | null;
  activeCitationIdx: number | null;
  toggleDarkMode: () => void;
  setUploadOpen: (v: boolean) => void;
  setActiveCitation: (c: Citation | null, idx?: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches,
      uploadOpen: false,
      activeCitation: null,
      activeCitationIdx: null,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setUploadOpen: (v) => set({ uploadOpen: v }),
      setActiveCitation: (c, idx) => set({ activeCitation: c, activeCitationIdx: idx ?? null }),
    }),
    { name: "pdf-chat-ui" },
  ),
);
