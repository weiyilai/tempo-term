import { describe, expect, it } from "vitest";
import { isEmptyProgress, progressKey, useProgressStore } from "./progressStore";
import { emptyProgressState, reduceProgress } from "./progressState";

const CODEX_EXEC_LINE = JSON.stringify({
  type: "response_item",
  payload: { type: "function_call", name: "exec_command", call_id: "c1", arguments: "{}" },
});
const CLAUDE_TOOL_LINE = JSON.stringify({
  type: "assistant",
  message: { content: [{ type: "tool_use", id: "t1", name: "Bash" }] },
});

describe("isEmptyProgress", () => {
  it("is true for a fresh empty state", () => {
    expect(isEmptyProgress(emptyProgressState())).toBe(true);
  });

  it("is false once a tool has run, even after it finished", () => {
    let state = reduceProgress(emptyProgressState(), { kind: "tool:start", id: "t1", name: "Bash" });
    state = reduceProgress(state, { kind: "tool:end", id: "t1", name: "Bash", ok: true });

    expect(isEmptyProgress(state)).toBe(false);
  });
});

describe("sessionEpochs", () => {
  it("increments a session's epoch each time it resets", () => {
    useProgressStore.setState({ sessions: {}, sessionEpochs: {} });
    const key = progressKey("/a", "claude");
    useProgressStore.getState().pushLines("/a", "claude", [], true);
    expect(useProgressStore.getState().sessionEpochs[key]).toBe(1);
    useProgressStore.getState().pushLines("/a", "claude", [], true);
    expect(useProgressStore.getState().sessionEpochs[key]).toBe(2);
  });

  it("does not bump the epoch on a non-reset append", () => {
    const key = progressKey("/a", "claude");
    useProgressStore.setState({ sessions: {}, sessionEpochs: { [key]: 1 } });
    useProgressStore.getState().pushLines("/a", "claude", [], false);
    expect(useProgressStore.getState().sessionEpochs[key]).toBe(1);
  });
});

describe("per-(cwd, agent) sessions", () => {
  it("keeps a cwd's codex and claude sessions independent", () => {
    useProgressStore.setState({ sessions: {}, sessionEpochs: {} });
    const store = useProgressStore.getState();
    // The same directory runs Codex in one pane and Claude in another. Both
    // streams arrive tagged with the same cwd but must not clobber each other.
    store.pushLines("/p", "codex", [CODEX_EXEC_LINE], false);
    store.pushLines("/p", "claude", [CLAUDE_TOOL_LINE], false);

    const sessions = useProgressStore.getState().sessions;
    const codex = sessions[progressKey("/p", "codex")];
    const claude = sessions[progressKey("/p", "claude")];
    expect(codex.activities).toHaveLength(1);
    expect(claude.activities).toHaveLength(1);
    expect(claude.activities[0].id).toBe("t1");
  });
});
