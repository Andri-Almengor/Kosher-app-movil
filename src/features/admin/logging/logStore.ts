import { create } from "zustand";

export type ApiLogLevel = "info" | "warn" | "error";

export type ApiLogItem = {
  id: string;
  ts: number;
  level: ApiLogLevel;
  message: string;
  meta?: any;
};

type State = {
  logs: ApiLogItem[];
  max: number;
};

type Actions = {
  add: (level: ApiLogLevel, message: string, meta?: any) => void;
  clear: () => void;
  setMax: (n: number) => void;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useApiLogStore = create<State & Actions>((set, get) => ({
  logs: [],
  max: 500,

  add(level, message, meta) {
    const item: ApiLogItem = {
      id: makeId(),
      ts: Date.now(),
      level,
      message: String(message ?? ""),
      meta,
    };

    const next = [...get().logs, item];
    const max = get().max;
    const trimmed = next.length > max ? next.slice(next.length - max) : next;
    set({ logs: trimmed });
  },

  clear() {
    set({ logs: [] });
  },

  setMax(n) {
    const max = Math.max(50, Math.min(5000, Number(n) || 500));
    const logs = get().logs;
    const trimmed = logs.length > max ? logs.slice(logs.length - max) : logs;
    set({ max, logs: trimmed });
  },
}));
