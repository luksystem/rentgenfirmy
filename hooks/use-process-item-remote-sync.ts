"use client";

import { useEffect, useRef } from "react";
import type { ProjectProcessItem } from "@/lib/process/types";
import { fetchProjectProcessItem } from "@/lib/supabase/process-item-repository";

const POLL_INTERVAL_MS = 4000;

export function useProcessItemRemoteSync({
  enabled,
  projectId,
  templateItemId,
  localUpdatedAt,
  onRemoteUpdate,
}: {
  enabled: boolean;
  projectId: string | undefined;
  templateItemId: string | undefined;
  localUpdatedAt: string | undefined;
  onRemoteUpdate: (item: ProjectProcessItem) => void;
}) {
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const localUpdatedAtRef = useRef(localUpdatedAt);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  useEffect(() => {
    localUpdatedAtRef.current = localUpdatedAt;
  }, [localUpdatedAt]);

  useEffect(() => {
    if (!enabled || !projectId || !templateItemId) {
      return;
    }

    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const remote = await fetchProjectProcessItem(projectId!, templateItemId!);
        if (cancelled) {
          return;
        }

        if (remote.updatedAt !== localUpdatedAtRef.current) {
          localUpdatedAtRef.current = remote.updatedAt;
          onRemoteUpdateRef.current(remote);
        }
      } catch {
        // Ignore transient network errors during polling.
      }
    }

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, projectId, templateItemId]);
}
