import { useEffect, useRef, useState } from "react";
import {
  Check,
  DownloadCloud,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Combobox } from "@/components/Combobox";
import { Tooltip } from "@/components/Tooltip";
import type { WorktreeItem } from "./lib/gitGraphBridge";
import type { Branch, CommitOrder } from "./types";

// Below this measured toolbar width the layout switches to compact: the action
// icons fold into a single overflow menu. Sized to the point where the roomy
// row (branch label + combobox + remote checkbox + four icons + HEAD text) just
// begins to crowd in a split panel.
const COMPACT_WIDTH = 620;

/** Last path segment; handles both / and \ separators (git on Windows may
 * print either). */
function worktreeBasename(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

interface WorktreeOption {
  label: string;
  path: string;
}

/** "basename (branch)" per worktree; colliding labels fall back to the full
 * path so every Combobox option string stays unique (selection maps back by
 * string value). */
function buildWorktreeOptions(worktrees: WorktreeItem[]): WorktreeOption[] {
  const base = worktrees.map((w) => ({
    label: w.branch ? `${worktreeBasename(w.path)} (${w.branch})` : worktreeBasename(w.path),
    path: w.path,
  }));
  const counts = new Map<string, number>();
  for (const option of base) {
    counts.set(option.label, (counts.get(option.label) ?? 0) + 1);
  }
  return base.map((option) =>
    (counts.get(option.label) ?? 0) > 1 ? { ...option, label: option.path } : option,
  );
}

/** Trailing-slash-insensitive path equality (resolve_repo trims, git doesn't). */
function samePath(a: string, b: string): boolean {
  return a.replace(/[\\/]+$/, "") === b.replace(/[\\/]+$/, "");
}

export interface GitGraphToolbarLabels {
  branches: string;
  showAll: string;
  showRemoteBranches: string;
  search: string;
  searchPlaceholder: string;
  displayOptions: string;
  showTags: string;
  showStashes: string;
  refresh: string;
  fetch: string;
  fetching: string;
  matches: string;
  head: string;
  more: string;
  commitOrder: string;
  orderDate: string;
  orderTopo: string;
  worktree: string;
  switchBranch: string;
}

interface GitGraphToolbarProps {
  branches: Branch[];
  selectedBranch: string | null;
  onSelectBranch: (branch: string | null) => void;
  includeRemotes: boolean;
  onToggleRemotes: (value: boolean) => void;
  includeTags: boolean;
  onToggleTags: (value: boolean) => void;
  includeStashes: boolean;
  onToggleStashes: (value: boolean) => void;
  commitOrder: CommitOrder;
  onChangeOrder: (order: CommitOrder) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchCount: number;
  onRefresh: () => void;
  onFetch: () => void;
  fetching: boolean;
  refreshing: boolean;
  currentBranch: string;
  worktrees: WorktreeItem[];
  currentWorktreePath: string | null;
  onSelectWorktree: (path: string) => void;
  onCheckoutBranch: (name: string) => void;
  onCheckoutRemoteBranch: (name: string) => void;
  labels: GitGraphToolbarLabels;
}

export function GitGraphToolbar({
  branches,
  selectedBranch,
  onSelectBranch,
  includeRemotes,
  onToggleRemotes,
  includeTags,
  onToggleTags,
  includeStashes,
  onToggleStashes,
  commitOrder,
  onChangeOrder,
  searchQuery,
  onSearchChange,
  matchCount,
  onRefresh,
  onFetch,
  fetching,
  refreshing,
  currentBranch,
  worktrees,
  currentWorktreePath,
  onSelectWorktree,
  onCheckoutBranch,
  onCheckoutRemoteBranch,
  labels,
}: GitGraphToolbarProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (typeof measured === "number") {
        setWidth(measured);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isCompact = width !== null && width < COMPACT_WIDTH;

  const locals = branches.filter((b) => !b.isRemote);
  const remotes = branches.filter((b) => b.isRemote);

  // Combobox takes a flat string list. "Show All" doubles as the sentinel that
  // maps back to null; remote names already carry their "origin/" prefix so the
  // two groups stay distinguishable without optgroup headers.
  const branchOptions = [
    labels.showAll,
    ...locals.map((b) => b.name),
    ...(includeRemotes ? remotes.map((b) => b.name) : []),
  ];

  // Toggles render either as the gear popover (roomy) or rows in the overflow
  // menu (compact). Remote-branches lives here too once the toolbar is compact.
  const toggles: ToggleRowProps[] = [
    { label: labels.showTags, checked: includeTags, onChange: onToggleTags },
    { label: labels.showStashes, checked: includeStashes, onChange: onToggleStashes },
  ];

  const orderOptions: { value: CommitOrder; label: string }[] = [
    { value: "date", label: labels.orderDate },
    { value: "topo", label: labels.orderTopo },
  ];
  const orderSection = (
    <>
      <div className="my-1 border-t border-border" />
      <div
        className="px-2 py-1 font-mono text-[11px] text-fg-subtle"
        aria-hidden="true"
      >
        {labels.commitOrder}
      </div>
      <div role="radiogroup" aria-label={labels.commitOrder}>
        {orderOptions.map((o) => (
          <OrderRow
            key={o.value}
            label={o.label}
            checked={commitOrder === o.value}
            onSelect={() => onChangeOrder(o.value)}
          />
        ))}
      </div>
    </>
  );

  // In compact mode an open search input needs the whole row, so the branch
  // combobox steps aside until search closes.
  const showBranchControls = !(isCompact && searchOpen);

  const worktreeOptions = buildWorktreeOptions(worktrees);
  const currentWorktree =
    currentWorktreePath === null
      ? undefined
      : worktreeOptions.find((o) => samePath(o.path, currentWorktreePath));
  // A single-worktree repo (the common case) hides the control entirely.
  const showWorktreeControls = showBranchControls && worktreeOptions.length > 1;

  return (
    <div
      ref={rootRef}
      className="relative flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-inset px-3 py-2"
    >
      {/* 左側：分支下拉 + 遠端開關（compact 時遠端開關移進 ⋯ 選單） */}
      <div className="flex min-w-0 items-center gap-3">
        {showBranchControls && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-fg-subtle">
            <span className="shrink-0">{labels.branches}:</span>
            <Combobox
              value={selectedBranch ?? labels.showAll}
              options={branchOptions}
              onChange={(v) => onSelectBranch(v === labels.showAll ? null : v)}
              ariaLabel={labels.branches}
              className="w-48"
            />
          </div>
        )}

        {showWorktreeControls && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-fg-subtle">
            <span className="shrink-0">{labels.worktree}:</span>
            <Combobox
              value={
                currentWorktree?.label ??
                (currentWorktreePath ? worktreeBasename(currentWorktreePath) : "")
              }
              options={worktreeOptions.map((o) => o.label)}
              onChange={(label) => {
                const picked = worktreeOptions.find((o) => o.label === label);
                if (picked && (!currentWorktree || picked.path !== currentWorktree.path)) {
                  onSelectWorktree(picked.path);
                }
              }}
              ariaLabel={labels.worktree}
              className="w-44"
            />
          </div>
        )}

        {!isCompact && (
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={includeRemotes}
              onChange={(e) => onToggleRemotes(e.target.checked)}
              className="accent-accent"
            />
            <span>{labels.showRemoteBranches}</span>
          </label>
        )}
      </div>

      {/* 右側：搜尋一直在；其餘 compact 時收進 ⋯ */}
      <div className="flex min-w-0 items-center gap-0.5">
        {searchOpen ? (
          <div className="flex min-w-0 items-center gap-1">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-52 rounded border border-border-strong bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {searchQuery.trim() !== "" && (
              <span className="whitespace-nowrap font-mono text-[11px] text-fg-subtle">
                {labels.matches.replace("{{count}}", String(matchCount))}
              </span>
            )}
            <Tooltip label={labels.search}>
              <button
                type="button"
                aria-label={labels.search}
                onClick={() => {
                  onSearchChange("");
                  setSearchOpen(false);
                }}
                className="rounded p-1 text-fg-subtle hover:bg-bg-elevated hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <Tooltip label={labels.search}>
            <button
              type="button"
              aria-label={labels.search}
              onClick={() => setSearchOpen(true)}
              className="rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-fg"
            >
              <Search className="h-4 w-4" />
            </button>
          </Tooltip>
        )}

        {isCompact ? (
          <div className="relative">
            <Tooltip label={labels.more}>
              <button
                type="button"
                aria-label={labels.more}
                aria-expanded={overflowOpen}
                onClick={() => setOverflowOpen((v) => !v)}
                className="rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-fg"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </Tooltip>
            {overflowOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setOverflowOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-30 mt-1 w-52 rounded-md border border-border-strong bg-bg-elevated p-1 shadow-lg">
                  <button
                    type="button"
                    aria-label={labels.switchBranch}
                    onClick={() => {
                      setOverflowOpen(false);
                      setBranchMenuOpen(true);
                    }}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left font-mono text-[11px] text-fg-subtle hover:bg-bg-inset hover:text-fg"
                  >
                    {labels.head}: {currentBranch}
                  </button>
                  <ActionRow
                    icon={
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                      />
                    }
                    label={labels.refresh}
                    disabled={refreshing}
                    onClick={() => {
                      setOverflowOpen(false);
                      onRefresh();
                    }}
                  />
                  <ActionRow
                    icon={
                      <DownloadCloud
                        className={`h-3.5 w-3.5 ${fetching ? "animate-pulse" : ""}`}
                      />
                    }
                    label={fetching ? labels.fetching : labels.fetch}
                    disabled={fetching}
                    onClick={() => {
                      setOverflowOpen(false);
                      onFetch();
                    }}
                  />
                  <div className="my-1 border-t border-border" />
                  <ToggleRow
                    label={labels.showRemoteBranches}
                    checked={includeRemotes}
                    onChange={onToggleRemotes}
                  />
                  {toggles.map((t) => (
                    <ToggleRow key={t.label} {...t} />
                  ))}
                  {orderSection}
                </div>
              </>
            )}
            {branchMenuOpen && (
              <BranchMenu
                locals={locals}
                remotes={remotes}
                currentBranch={currentBranch}
                onCheckoutBranch={onCheckoutBranch}
                onCheckoutRemoteBranch={onCheckoutRemoteBranch}
                onClose={() => setBranchMenuOpen(false)}
              />
            )}
          </div>
        ) : (
          <>
            <div className="relative">
              <Tooltip label={labels.displayOptions}>
                <button
                  type="button"
                  aria-label={labels.displayOptions}
                  onClick={() => setOptionsOpen((v) => !v)}
                  className="rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-fg"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </Tooltip>
              {optionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setOptionsOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 z-30 mt-1 w-48 rounded-md border border-border-strong bg-bg-elevated p-1 shadow-lg">
                    {toggles.map((t) => (
                      <ToggleRow key={t.label} {...t} />
                    ))}
                    {orderSection}
                  </div>
                </>
              )}
            </div>

            <Tooltip label={labels.refresh}>
              <button
                type="button"
                aria-label={labels.refresh}
                onClick={onRefresh}
                disabled={refreshing}
                className="rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </Tooltip>

            <Tooltip label={fetching ? labels.fetching : labels.fetch}>
              <button
                type="button"
                aria-label={fetching ? labels.fetching : labels.fetch}
                onClick={onFetch}
                disabled={fetching}
                className="rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-fg disabled:opacity-50"
              >
                <DownloadCloud className={`h-4 w-4 ${fetching ? "animate-pulse" : ""}`} />
              </button>
            </Tooltip>

            <div className="relative">
              <Tooltip label={labels.switchBranch}>
                <button
                  type="button"
                  aria-label={labels.switchBranch}
                  aria-expanded={branchMenuOpen}
                  onClick={() => setBranchMenuOpen((v) => !v)}
                  className="ml-1 whitespace-nowrap rounded px-1 py-0.5 font-mono text-[11px] text-fg-subtle hover:bg-bg-elevated hover:text-fg"
                >
                  {labels.head}: {currentBranch}
                </button>
              </Tooltip>
              {branchMenuOpen && (
                <BranchMenu
                  locals={locals}
                  remotes={remotes}
                  currentBranch={currentBranch}
                  onCheckoutBranch={onCheckoutBranch}
                  onCheckoutRemoteBranch={onCheckoutRemoteBranch}
                  onClose={() => setBranchMenuOpen(false)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-bg-inset hover:text-fg"
    >
      <span>{label}</span>
      {checked && <Check className="h-3.5 w-3.5 text-accent" />}
    </button>
  );
}

interface OrderRowProps {
  label: string;
  checked: boolean;
  onSelect: () => void;
}

function OrderRow({ label, checked, onSelect }: OrderRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-bg-inset hover:text-fg"
    >
      <span>{label}</span>
      {checked && <Check className="h-3.5 w-3.5 text-accent" />}
    </button>
  );
}

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ActionRow({ icon, label, onClick, disabled = false }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-bg-inset hover:text-fg disabled:opacity-50"
    >
      <span className="text-fg-subtle">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

interface BranchMenuProps {
  locals: Branch[];
  remotes: Branch[];
  currentBranch: string;
  onCheckoutBranch: (name: string) => void;
  onCheckoutRemoteBranch: (name: string) => void;
  onClose: () => void;
}

/** The checkout popover behind the HEAD display. Locals check out directly;
 * remotes route to the create-tracking-branch modal owned by the tab. */
function BranchMenu({
  locals,
  remotes,
  currentBranch,
  onCheckoutBranch,
  onCheckoutRemoteBranch,
  onClose,
}: BranchMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />
      <div
        role="menu"
        className="absolute right-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-border-strong bg-bg-elevated p-1 shadow-lg"
      >
        {locals.map((b) => (
          <button
            key={b.name}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              if (b.name !== currentBranch) {
                onCheckoutBranch(b.name);
              }
            }}
            className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-bg-inset hover:text-fg"
          >
            <span className="truncate font-mono">{b.name}</span>
            {b.name === currentBranch && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
          </button>
        ))}
        {remotes.length > 0 && (
          <>
            <div className="my-1 border-t border-border" />
            {remotes.map((b) => (
              <button
                key={b.name}
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  onCheckoutRemoteBranch(b.name);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-bg-inset hover:text-fg"
              >
                <span className="truncate font-mono">{b.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
