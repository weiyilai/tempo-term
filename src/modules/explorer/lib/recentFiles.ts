import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { perWindowStorage } from "@/lib/window";

/** How many recently-opened paths to remember, most-recent first. */
export const MAX_RECENT_FILES = 20;

const STORAGE_KEY = "tempoterm-recent-files";

interface RecentFilesState {
  /** Most-recently-opened paths first. Scoped across workspaces; callers
   *  filter down to the active root's file list to display it. */
  paths: string[];
  /** Record a path as just opened, moving it to the front if already present. */
  addRecent: (path: string) => void;
}

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set) => ({
      paths: [],
      addRecent: (path) =>
        set((state) => ({
          paths: [path, ...state.paths.filter((p) => p !== path)].slice(0, MAX_RECENT_FILES),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => perWindowStorage()),
    },
  ),
);
