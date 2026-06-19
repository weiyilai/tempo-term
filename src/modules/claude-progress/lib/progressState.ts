import type { ProgressEvent, TodoItem } from "./normalize";

export interface RunningTool {
  id: string;
  name: string;
}

export interface SubagentProgress {
  id: string;
  agentType: string;
  description: string;
  status: "running" | "done" | "failed";
  durationMs?: number;
  tokens?: number;
  toolUseCount?: number;
}

export interface ProgressState {
  runningTools: RunningTool[];
  subagents: SubagentProgress[];
  todos: TodoItem[];
  idle: boolean;
}

export function emptyProgressState(): ProgressState {
  return { runningTools: [], subagents: [], todos: [], idle: false };
}

/**
 * Folds one normalized progress event into the accumulated state a UI renders.
 * Pure and immutable: callers thread the returned state into the next call.
 * "Activity" events (a tool or subagent starting, a todo update) clear the idle
 * flag; an explicit idle event sets it.
 */
export function reduceProgress(state: ProgressState, event: ProgressEvent): ProgressState {
  switch (event.kind) {
    case "tool:start":
      return {
        ...state,
        idle: false,
        runningTools: [...state.runningTools, { id: event.id, name: event.name }],
      };
    case "tool:end":
      return {
        ...state,
        runningTools: state.runningTools.filter((tool) => tool.id !== event.id),
      };
    case "subagent:start":
      return {
        ...state,
        idle: false,
        subagents: [
          ...state.subagents,
          {
            id: event.id,
            agentType: event.agentType,
            description: event.description,
            status: "running",
          },
        ],
      };
    case "subagent:end":
      return {
        ...state,
        subagents: state.subagents.map((sub) =>
          sub.id === event.id
            ? {
                ...sub,
                status: event.ok ? "done" : "failed",
                durationMs: event.durationMs,
                tokens: event.tokens,
                toolUseCount: event.toolUseCount,
              }
            : sub,
        ),
      };
    case "todo": {
      // Transcript appends often re-emit an unchanged todo list. Returning the
      // same reference when nothing changed lets the store short-circuit instead
      // of rewriting sessions and re-rendering on every append.
      if (state.idle === false && todosEqual(state.todos, event.items)) {
        return state;
      }
      return { ...state, idle: false, todos: event.items };
    }
    case "idle":
      if (state.idle) {
        return state;
      }
      return { ...state, idle: true };
    default:
      return state;
  }
}

/** True when two todo lists have the same items, in the same order, by content. */
function todosEqual(a: TodoItem[], b: TodoItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((item, index) => item.text === b[index].text && item.status === b[index].status);
}

export type { TodoItem };
