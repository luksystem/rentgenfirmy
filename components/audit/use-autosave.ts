"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

// Autozapis z debounce, kolejką offline (ponowienie po powrocie sieci) i blokadą
// utraty niezapisanych danych (beforeunload). saveFn powinno czytać najnowszy stan (ref).
export function useAutosave(saveFn: () => Promise<void>, delay = 900) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const saveRef = useRef(saveFn);
  saveRef.current = saveFn;

  const flush = useCallback(async () => {
    if (!pendingRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline");
      return;
    }
    setStatus("saving");
    try {
      await saveRef.current();
      pendingRef.current = false;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  const schedule = useCallback(() => {
    pendingRef.current = true;
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), delay);
  }, [flush, delay]);

  useEffect(() => {
    const onOnline = () => {
      if (pendingRef.current) void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);

  return { status, schedule, flush, hasPending: () => pendingRef.current };
}
