import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  SmsMessageRecord,
  SmsMessageStatus,
  SmsMetadata,
  SmsProviderName,
} from "@/lib/sms/types";

function mapRow(row: Record<string, unknown>): SmsMessageRecord {
  return {
    id: String(row.id),
    recipient_phone: String(row.recipient_phone),
    message: String(row.message),
    provider: row.provider as SmsProviderName,
    provider_message_id: row.provider_message_id ? String(row.provider_message_id) : null,
    status: row.status as SmsMessageStatus,
    error_message: row.error_message ? String(row.error_message) : null,
    metadata: (row.metadata as SmsMetadata) ?? {},
    sent_at: row.sent_at ? String(row.sent_at) : null,
    delivered_at: row.delivered_at ? String(row.delivered_at) : null,
    created_at: String(row.created_at),
  };
}

export async function createQueuedSmsMessage(input: {
  recipientPhone: string;
  message: string;
  provider: SmsProviderName;
  metadata?: SmsMetadata;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sms_messages")
    .insert({
      recipient_phone: input.recipientPhone,
      message: input.message,
      provider: input.provider,
      status: "queued",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nie udało się zapisać SMS w bazie.");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function markSmsMessageSent(input: {
  id: string;
  providerMessageId: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sms_messages")
    .update({
      status: "sent",
      provider_message_id: input.providerMessageId,
      sent_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nie udało się zaktualizować statusu SMS.");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function markSmsMessageFailed(input: { id: string; errorMessage: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sms_messages")
    .update({
      status: "failed",
      error_message: input.errorMessage,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nie udało się zapisać błędu SMS.");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function updateSmsMessageByProviderId(input: {
  providerMessageId: string;
  status: SmsMessageStatus;
  deliveredAt?: string | null;
  errorMessage?: string | null;
  metadataPatch?: SmsMetadata;
}) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: loadError } = await supabase
    .from("sms_messages")
    .select("*")
    .eq("provider_message_id", input.providerMessageId)
    .maybeSingle();

  if (loadError) {
    throw new Error(loadError.message);
  }

  if (!existing) {
    return null;
  }

  const current = mapRow(existing as Record<string, unknown>);
  const patch: {
    status: SmsMessageStatus;
    delivered_at?: string;
    error_message?: string;
    metadata?: SmsMetadata;
  } = {
    status: input.status,
  };

  if (input.deliveredAt) {
    patch.delivered_at = input.deliveredAt;
  }

  if (input.errorMessage) {
    patch.error_message = input.errorMessage;
  }

  if (input.metadataPatch) {
    patch.metadata = {
      ...current.metadata,
      ...input.metadataPatch,
    };
  }

  const { data, error } = await supabase
    .from("sms_messages")
    .update(patch)
    .eq("id", current.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nie udało się zaktualizować statusu doręczenia SMS.");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function listRecentSmsMessages(limit = 10) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sms_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}
