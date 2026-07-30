// Faza 9A (docs/08 D18/D19 §5) — zapis faktu kontaktu i odczyt rejestru.
import { getSupabase } from "@/lib/supabase/client";
import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationEventEntry,
} from "@/lib/communication/types";

/**
 * „Odezwaliśmy się do klienta" — JEDEN przycisk, JEDNA oś (decyzja właściciela).
 *
 * Zapisuje wyłącznie `wychodzace`: gdy nie odpowiadamy, nikt nie kliknie, więc oś kliencka
 * ustawiana ręcznie byłaby systematycznie zawyżona i zamaskowałaby najgroźniejszy przypadek.
 * Oś kliencka idzie wyłącznie ze źródeł automatycznych.
 *
 * `eventAt` przyjmuje datę WSTECZNĄ (ludzie nie klikają w momencie rozmowy). Data przyszła jest
 * odrzucana triggerem w bazie, nie tylko tu — wpis „w przód" cicho uśpiłby bezpiecznik ciszy.
 */
export async function logOutgoingContact(input: {
  projectId: string;
  eventAt: string;
  actorId?: string | null;
  actorName: string;
  note?: string;
}): Promise<void> {
  const supabase = getSupabase();
  // RPC, nie zwykły insert: zdarzenie i odświeżenie cache'u osi muszą polecieć atomowo, inaczej
  // kliknięcie nie zdjęłoby projektu z listy ciszy do następnego przebiegu crona (migracja 259).
  const { error } = await supabase.rpc("log_outgoing_contact", {
    p_project_id: input.projectId,
    p_event_at: input.eventAt,
    p_actor_id: input.actorId ?? null,
    p_actor_name: input.actorName.trim() || "Zespół",
    p_note: input.note?.trim() ?? "",
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Rejestr projektu — ręczne wpisy + zdarzenia pochodne, przekrój liczony przy odczycie. */
export async function fetchCommunicationEvents(
  projectId: string,
): Promise<CommunicationEventEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_communication_events", {
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => Boolean(row.event_at))
    .map((row) => ({
      source: row.source,
      direction: row.direction as CommunicationDirection,
      channel: row.channel as CommunicationChannel,
      eventAt: row.event_at as string,
      actorName: row.actor_name,
      title: row.title,
    }));
}
