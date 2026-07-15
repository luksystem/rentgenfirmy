"use client";

import { useEffect, useState } from "react";

/** Controlled number input that allows clearing the field while typing. */
export function useDraftNumber(
  value: number,
  onCommit: (next: number) => void,
  options?: { min?: number; max?: number; emptyFallback?: number },
) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function clamp(n: number) {
    let next = n;
    if (options?.min != null) next = Math.max(options.min, next);
    if (options?.max != null) next = Math.min(options.max, next);
    return next;
  }

  return {
    value: draft,
    onChange: (raw: string) => {
      setDraft(raw);
      if (raw.trim() === "") return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      onCommit(clamp(parsed));
    },
    onBlur: () => {
      const fallback = options?.emptyFallback ?? options?.min ?? 0;
      if (draft.trim() === "") {
        setDraft(String(fallback));
        onCommit(fallback);
        return;
      }
      const parsed = Number(draft);
      const next = clamp(Number.isFinite(parsed) ? parsed : fallback);
      setDraft(String(next));
      onCommit(next);
    },
  };
}
