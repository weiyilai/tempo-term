import { beforeEach, describe, expect, it } from "vitest";
import { MAX_RECENT_FILES, useRecentFilesStore } from "./recentFiles";

beforeEach(() => {
  useRecentFilesStore.setState({ paths: [] });
});

describe("recentFiles store", () => {
  it("adds a newly opened path to the front of the list", () => {
    useRecentFilesStore.getState().addRecent("/p/a.ts");
    useRecentFilesStore.getState().addRecent("/p/b.ts");

    expect(useRecentFilesStore.getState().paths).toEqual(["/p/b.ts", "/p/a.ts"]);
  });

  it("moves a re-opened path back to the front instead of duplicating it", () => {
    useRecentFilesStore.getState().addRecent("/p/a.ts");
    useRecentFilesStore.getState().addRecent("/p/b.ts");
    useRecentFilesStore.getState().addRecent("/p/a.ts");

    expect(useRecentFilesStore.getState().paths).toEqual(["/p/a.ts", "/p/b.ts"]);
  });

  it("caps the list at MAX_RECENT_FILES, dropping the oldest entries", () => {
    for (let i = 0; i < MAX_RECENT_FILES + 5; i++) {
      useRecentFilesStore.getState().addRecent(`/p/${i}.ts`);
    }

    const { paths } = useRecentFilesStore.getState();
    expect(paths).toHaveLength(MAX_RECENT_FILES);
    // Most recent (last added) stays at the front; the oldest 5 fall off.
    expect(paths[0]).toBe(`/p/${MAX_RECENT_FILES + 4}.ts`);
    expect(paths).not.toContain("/p/0.ts");
  });
});
