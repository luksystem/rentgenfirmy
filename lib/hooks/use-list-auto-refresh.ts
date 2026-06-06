"use client";

import { useEffect } from "react";

const DEFAULT_INTERVAL_MS = 30_000;

export function useListAutoRefresh(
  refresh: () => Promise<void>,
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    refreshIfVisible();

    const intervalId = window.setInterval(refreshIfVisible, intervalMs);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [enabled, intervalMs, refresh]);
}
