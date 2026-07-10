"use client";

import { useEffect, useRef, useState } from "react";

// Animowany licznik. Respektuje prefers-reduced-motion (wtedy pokazuje od razu wartość docelową).
export function useCountUp(target: number, durationMs = 900, decimals = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;
    const factor = 10 ** decimals;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round((from + (target - from) * eased) * factor) / factor);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, decimals]);

  return value;
}
