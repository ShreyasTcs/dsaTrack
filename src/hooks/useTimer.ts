"use client";

import { useState, useRef, useCallback } from "react";

export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [running]);

  const pause = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return { elapsed, running, start, pause, reset, display: formatTime(elapsed), minutes: Math.round(elapsed / 60) };
}
