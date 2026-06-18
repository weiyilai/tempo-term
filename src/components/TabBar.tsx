import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileCode,
  FileText,
  GitBranch,
  Globe,
  LayoutGrid,
  PanelLeft,
  Plus,
  SquareTerminal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTabsStore, type Tab } from "@/stores/tabsStore";
import { computeLayout } from "@/modules/terminal/lib/terminalLayout";
import { useEditorStore } from "@/modules/editor/store/editorStore";
import { useUiStore } from "@/stores/uiStore";
import { SpaceDropdown } from "./SpaceDropdown";

function tabIcon(kind: Tab["kind"]): LucideIcon {
  switch (kind) {
    case "terminal":
      return SquareTerminal;
    case "editor":
      return FileCode;
    case "note":
      return FileText;
    case "preview":
      return Globe;
    case "git-graph":
      return GitBranch;
    case "launcher":
      return LayoutGrid;
  }
}

function TabItem({ id }: { id: string }) {
  const { t } = useTranslation();
  const tab = useTabsStore((s) => s.tabs.find((x) => x.id === id));
  const activeId = useTabsStore((s) => s.activeId);
  const setActive = useTabsStore((s) => s.setActive);
  const closeTab = useTabsStore((s) => s.closeTab);
  const setTabTitle = useTabsStore((s) => s.setTabTitle);
  // A tab is dirty when any of its editor panes has unsaved changes.
  const dirty = useEditorStore((s) => {
    if (!tab) {
      return false;
    }
    return computeLayout(tab.paneTree)
      .map((p) => p.content)
      .some(
        (c) =>
          c.kind === "editor" &&
          (s.buffers[c.path]?.content ?? "") !== (s.buffers[c.path]?.baseline ?? ""),
      );
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (!tab) {
    return null;
  }
  const active = tab.id === activeId;
  const Icon = tabIcon(tab.kind);

  function commit() {
    if (tab && draft.trim()) {
      setTabTitle(tab.id, draft.trim());
    }
    setEditing(false);
  }

  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={() => setActive(tab.id)}
      onDoubleClick={() => {
        setDraft(tab.title);
        setEditing(true);
      }}
      title={tab.title}
      className={`group flex h-7 cursor-pointer items-center gap-2 rounded-md px-3 text-xs transition-colors ${
        active ? "bg-bg-elevated text-fg" : "text-fg-muted hover:bg-bg-elevated/60"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-28 rounded border border-accent bg-bg px-1 text-xs text-fg outline-none"
        />
      ) : (
        <span className="max-w-[160px] truncate">{tab.title}</span>
      )}
      {dirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      <button
        type="button"
        aria-label={t("actions.closeTab")}
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        className="rounded p-0.5 text-fg-subtle hover:bg-border-strong hover:text-fg"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function TabBar() {
  const { t } = useTranslation();
  const tabs = useTabsStore((s) => s.tabs);
  const activeSpaceId = useTabsStore((s) => s.activeSpaceId);
  const visibleTabs = tabs.filter((tab) => tab.spaceId === activeSpaceId);
  const openLauncherTab = useTabsStore((s) => s.openLauncherTab);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarVisible = useUiStore((s) => s.sidebarVisible);

  return (
    <header
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-bg-inset pl-20 pr-2"
    >
      <button
        type="button"
        aria-label={t("workspace.toggleSidebar")}
        title={t("workspace.toggleSidebar")}
        aria-pressed={sidebarVisible}
        onClick={toggleSidebar}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-bg-elevated ${
          sidebarVisible ? "text-fg" : "text-fg-subtle hover:text-fg"
        }`}
      >
        <PanelLeft size={16} />
      </button>
      <SpaceDropdown />
      <div className="mx-1 h-4 w-px shrink-0 bg-border" />
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        {visibleTabs.map((tab) => (
          <TabItem key={tab.id} id={tab.id} />
        ))}
      </div>

      <button
        type="button"
        aria-label={t("workspace.addTab")}
        title={t("workspace.addTab")}
        onClick={() => openLauncherTab()}
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-elevated hover:text-fg"
      >
        <Plus size={16} />
      </button>
    </header>
  );
}
