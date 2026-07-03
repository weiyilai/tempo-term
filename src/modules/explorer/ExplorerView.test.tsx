import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("./lib/fsBridge", () => ({ fsReadDir: vi.fn().mockResolvedValue([]) }));

import { ExplorerView } from "./ExplorerView";
import { useWorkspaceStore } from "@/stores/workspaceStore";

beforeEach(() => {
  useWorkspaceStore.setState({ rootPath: null });
});

describe("ExplorerView remote root", () => {
  it("hides the open-folder button and shows the remote path", () => {
    useWorkspaceStore.setState({ rootPath: "ssh://c1/home/me" });
    render(<ExplorerView />);
    expect(screen.queryByLabelText("Open folder")).toBeNull();
    expect(screen.getByText("/home/me")).toBeInTheDocument();
  });

  it("keeps the open-folder button for a local root", () => {
    useWorkspaceStore.setState({ rootPath: "/home/me" });
    render(<ExplorerView />);
    expect(screen.getByLabelText("Open folder")).toBeInTheDocument();
  });

  // The fuzzy file search moved to a global header trigger (Cmd/Ctrl+P) — see
  // TabBar.test.tsx — so it is no longer embedded in this sidebar panel.
  it("no longer renders a Find files button here", () => {
    useWorkspaceStore.setState({ rootPath: "/home/me" });
    render(<ExplorerView />);
    expect(screen.queryByLabelText("Find files")).toBeNull();
  });
});
