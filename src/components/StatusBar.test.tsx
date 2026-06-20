import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import "@/i18n";
import { StatusBar } from "./StatusBar";
import { useUiStore } from "@/stores/uiStore";

beforeEach(() => {
  useUiStore.setState({ sidebarView: "explorer", sidebarVisible: false });
});

describe("StatusBar Claude activity button", () => {
  it("opens the workspaces sidebar view when clicked", () => {
    render(<StatusBar />);
    fireEvent.click(screen.getByLabelText("Claude 進度"));
    expect(useUiStore.getState().sidebarView).toBe("workspaces");
    expect(useUiStore.getState().sidebarVisible).toBe(true);
  });
});
