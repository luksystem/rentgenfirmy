"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const REALTIME_TABLES = [
  "project_client_agreements",
  "project_agreement_approvals",
  "project_agreement_comments",
  "project_agreement_versions",
] as const;

const CHANNEL_NAME = "agreements-hub-sync";

type RefreshListener = () => void;

const sharedHub = {
  channel: null as RealtimeChannel | null,
  listeners: new Set<RefreshListener>(),
  debounceRef: null as ReturnType<typeof setTimeout> | null,
  subscriberCount: 0,
};

function scheduleSharedRefresh() {
  if (sharedHub.debounceRef) {
    clearTimeout(sharedHub.debounceRef);
  }

  sharedHub.debounceRef = setTimeout(() => {
    for (const listener of sharedHub.listeners) {
      listener();
    }
  }, 250);
}

function ensureSharedChannel() {
  if (sharedHub.channel || !isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabase();
  let channel = supabase.channel(CHANNEL_NAME);

  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      scheduleSharedRefresh,
    );
  }

  sharedHub.channel = channel;
  channel.subscribe();
}

function teardownSharedChannelIfIdle() {
  if (sharedHub.subscriberCount > 0 || !sharedHub.channel) {
    return;
  }

  if (sharedHub.debounceRef) {
    clearTimeout(sharedHub.debounceRef);
    sharedHub.debounceRef = null;
  }

  void getSupabase().removeChannel(sharedHub.channel);
  sharedHub.channel = null;
}

function subscribeToAgreementsHub(onRefresh: RefreshListener) {
  sharedHub.listeners.add(onRefresh);
  sharedHub.subscriberCount += 1;
  ensureSharedChannel();

  return () => {
    sharedHub.listeners.delete(onRefresh);
    sharedHub.subscriberCount = Math.max(0, sharedHub.subscriberCount - 1);
    teardownSharedChannelIfIdle();
  };
}

export function useAgreementsHubRealtime(onRefresh: () => void, options?: { enabled?: boolean }) {
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const enabled = options?.enabled ?? true;
    if (!enabled || !isSupabaseConfigured()) {
      return;
    }

    const listener = () => {
      onRefreshRef.current();
    };

    return subscribeToAgreementsHub(listener);
  }, [options?.enabled]);
}
