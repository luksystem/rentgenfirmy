import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PushSubscriptionInput, PushSubscriptionRecord } from "@/lib/push/types";

type DbClient = SupabaseClient<Database>;

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_name: string | null;
  platform: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

function mapRow(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    deviceName: row.device_name,
    platform: row.platform,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

export function validateSubscriptionInput(body: unknown): PushSubscriptionInput {
  if (!body || typeof body !== "object") {
    throw new Error("Nieprawidłowe dane subskrypcji.");
  }

  const input = body as Record<string, unknown>;
  const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim() : "";
  const keys = input.keys as Record<string, unknown> | undefined;
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys?.auth === "string" ? keys.auth.trim() : "";

  if (!endpoint || !endpoint.startsWith("https://")) {
    throw new Error("Nieprawidłowy endpoint subskrypcji.");
  }
  if (!p256dh || !auth) {
    throw new Error("Brak kluczy subskrypcji push.");
  }

  return {
    endpoint,
    keys: { p256dh, auth },
    deviceName:
      typeof input.deviceName === "string" && input.deviceName.trim()
        ? input.deviceName.trim().slice(0, 120)
        : undefined,
    platform:
      typeof input.platform === "string" && input.platform.trim()
        ? input.platform.trim().slice(0, 64)
        : undefined,
  };
}

export async function fetchPushSubscriptionByEndpoint(
  supabase: DbClient,
  endpoint: string,
): Promise<PushSubscriptionRecord | null> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data as PushSubscriptionRow) : null;
}

export async function fetchActivePushSubscriptionsForUser(
  supabase: DbClient,
  userId: string,
): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as PushSubscriptionRow));
}

export async function upsertPushSubscription(
  supabase: DbClient,
  input: {
    userId: string;
    subscription: PushSubscriptionInput;
    userAgent?: string | null;
  },
): Promise<PushSubscriptionRecord> {
  const now = new Date().toISOString();
  const row = {
    user_id: input.userId,
    endpoint: input.subscription.endpoint,
    p256dh: input.subscription.keys.p256dh,
    auth: input.subscription.keys.auth,
    user_agent: input.userAgent ?? null,
    device_name: input.subscription.deviceName ?? null,
    platform: input.subscription.platform ?? null,
    active: true,
    updated_at: now,
    last_used_at: null,
  };

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data as PushSubscriptionRow);
}

export async function deactivatePushSubscription(
  supabase: DbClient,
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function removePushSubscriptionById(supabase: DbClient, id: string) {
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function touchPushSubscriptionLastUsed(supabase: DbClient, id: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ last_used_at: now, updated_at: now })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
