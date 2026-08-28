import { useCallback, useEffect, useRef, useState } from "react";
import type { Config } from "@statusline/core";

const KEY = "statusline.config.v1";
const LIMIT = 80;

export function loadStored(fallback: Config): Config {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Config;
  } catch { /* private mode, cleared storage, quota — fall through */ }
  return fallback;
}

/** Undo/redo over whole configs. Small enough that structural sharing is noise. */
export function useHistory(initial: Config) {
  const [present, setPresent] = useState<Config>(initial);
  const past = useRef<Config[]>([]);
  const future = useRef<Config[]>([]);
  const [, bump] = useState(0);

  const commit = useCallback((next: Config | ((c: Config) => Config)) => {
    setPresent((cur) => {
      const value = typeof next === "function" ? (next as (c: Config) => Config)(cur) : next;
      if (value === cur) return cur;
      past.current = [...past.current.slice(-LIMIT), cur];
      future.current = [];
      return value;
    });
    bump((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    setPresent((cur) => { future.current = [cur, ...future.current]; return prev; });
    bump((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.shift();
    if (!next) return;
    setPresent((cur) => { past.current = [...past.current, cur]; return next; });
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(present)); } catch { /* quota */ }
  }, [present]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return {
    config: present,
    setConfig: commit,
    undo, redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
