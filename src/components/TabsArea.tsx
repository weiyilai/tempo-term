import { PaneTabContent } from "@/modules/terminal/PaneTabContent";
import { LauncherPanel } from "@/components/LauncherPanel";
import { useTabsStore } from "@/stores/tabsStore";

/**
 * The main work area. Every tab is a PaneTabContent (a splittable pane tree).
 * Inactive tabs stay mounted but hidden so their terminals keep running.
 * With no tabs at all, the launcher takes over the whole area.
 */
export function TabsArea() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);

  if (!activeId) {
    return <LauncherPanel />;
  }

  return (
    <div className="relative h-full w-full bg-bg">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`absolute inset-0 ${tab.id === activeId ? "" : "hidden"}`}
        >
          {tab.kind === "launcher" ? (
            <LauncherPanel target={{ mode: "newTab", closeTabId: tab.id }} />
          ) : (
            <PaneTabContent tab={tab} />
          )}
        </div>
      ))}
    </div>
  );
}
