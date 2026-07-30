import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/send-push";

/**
 * D44 — przekaźnik pusha dla powiadomień tworzonych w bazie.
 *
 * Powiadomienia D44 powstają triggerem, żeby żadna ścieżka zmiany statusu nie zamknęła tematu po
 * cichu. Skutek uboczny: omijają `sendNotificationChannels`, które żyje w TypeScripcie — więc push
 * nigdy nie szedł. Ten przekaźnik domyka lukę, nie oddając gwarancji.
 */

/** Rodzaje, dla których push ma sens. Świadomie wąska lista, nie „wszystko co nowe”. */
const PUSH_RELAY_KINDS = [
  "employee_report_urgent",
  "employee_report_classified",
  "employee_report_accepted",
  "employee_report_completed",
  "employee_report_closed",
] as const;

/**
 * Okno wieku. Powiadomienie starsze niż to zostaje oznaczone jako obsłużone BEZ wysyłki —
 * push o czymś sprzed doby jest gorszy niż jego brak, a wiersz musi przestać wracać w kolejce.
 */
const MAX_AGE_MINUTES = 180;

const BATCH_SIZE = 100;

export type PushRelayResult = {
  candidates: number;
  pushed: number;
  skippedNoSubscription: number;
  skippedTooOld: number;
  failed: number;
};

export async function runNotificationPushRelay(): Promise<PushRelayResult> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, profile_id, kind, title, body, link_url, created_at")
    .is("pushed_at", null)
    .in("kind", PUSH_RELAY_KINDS as readonly string[])
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as {
    id: string;
    profile_id: string;
    kind: string;
    title: string;
    body: string;
    link_url: string | null;
    created_at: string;
  }[];

  const result: PushRelayResult = {
    candidates: rows.length,
    pushed: 0,
    skippedNoSubscription: 0,
    skippedTooOld: 0,
    failed: 0,
  };

  const cutoff = Date.now() - MAX_AGE_MINUTES * 60_000;

  for (const row of rows) {
    // Znacznik stawiamy ZAWSZE, także przy braku subskrypcji i przy błędzie wysyłki. Inaczej ten
    // sam wiersz wracałby w każdym przebiegu i albo dublował push, albo blokował kolejkę.
    let markProcessed = true;

    try {
      if (new Date(row.created_at).getTime() < cutoff) {
        result.skippedTooOld += 1;
      } else {
        const sendResult = await sendPushToUser(row.profile_id, {
          title: row.title,
          body: row.body,
          url: row.link_url ?? undefined,
          tag: `notification-${row.id}`,
        });
        if (sendResult.sent > 0) {
          result.pushed += 1;
        } else {
          result.skippedNoSubscription += 1;
        }
      }
    } catch {
      result.failed += 1;
      // Błąd wysyłki nie może zablokować reszty paczki — powiadomienie i tak jest w dzwonku,
      // push jest dodatkiem. Znacznik zostaje, żeby nie pętlić się na jednym uszkodzonym wierszu.
      markProcessed = true;
    }

    if (markProcessed) {
      await supabase
        .from("user_notifications")
        .update({ pushed_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }

  return result;
}
