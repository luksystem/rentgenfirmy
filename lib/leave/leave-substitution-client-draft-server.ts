import "server-only";

import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SubstitutionSlotFacts } from "@/lib/leave/substitution-trigger";
import { formatDate } from "@/lib/utils";
import { sendPushToUser } from "@/lib/push/send-push";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

/**
 * Faza 13 Krok 1 (/docs/role/04 §6.2 pkt 6) — nieobecność opiekun_projektu > 5 dni roboczych.
 * Rejestr formalnych komunikatów do inwestora (§10) nie istnieje jeszcze — zamiast go budować,
 * generujemy notyfikację z GOTOWYM TEKSTEM SZKICU, jawnie oznaczoną jako do skopiowania i
 * wysłania ręcznie (zero automatycznej wysyłki, zgodnie z "żaden komunikat nie wychodzi do
 * inwestora bez zatwierdzenia człowieka" — CLAUDE.md).
 *
 * Odbiorca (doprecyzowanie właściciela, docs/08 D48): zastępca opiekuna na ten okres, a gdy
 * zastępcy brak (slot=luka) — właściciel projektu. NIGDY wnioskujący (on i tak wyjeżdża).
 */
export async function draftClientCommunicationForCaretakerAbsence(
  admin: AdminClient,
  input: {
    leaveRequestId: string;
    profileId: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    triggeredSlots: SubstitutionSlotFacts[];
  },
): Promise<void> {
  const caretakerSlots = input.triggeredSlots.filter((slot) => slot.roleCode === "opiekun_projektu");
  if (caretakerSlots.length === 0) return;

  for (const slot of caretakerSlots) {
    const { data: substitutionSlot } = await admin
      .from("leave_substitution_slot")
      .select("status, selected_user_id")
      .eq("leave_request_id", input.leaveRequestId)
      .eq("project_id", slot.projectId)
      .eq("role_code", "opiekun_projektu")
      .maybeSingle();

    let recipientId = substitutionSlot && substitutionSlot.status !== "luka"
      ? substitutionSlot.selected_user_id
      : null;

    if (!recipientId) {
      const { data: ownerSlot } = await admin
        .from("project_role_slot")
        .select("user_id")
        .eq("project_id", slot.projectId)
        .eq("role_code", "wlasciciel")
        .is("to_date", null)
        .maybeSingle();
      recipientId = ownerSlot?.user_id ?? null;
    }

    if (!recipientId) continue;

    const { data: recipientProfile } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", recipientId)
      .maybeSingle();
    const recipientName = recipientProfile
      ? `${recipientProfile.first_name} ${recipientProfile.last_name}`.trim()
      : "zastępca";

    const draftText =
      `Szanowni Państwo,\n\nw okresie ${formatDate(input.startDate)}–${formatDate(input.endDate)} ` +
      `bieżącą opiekę nad projektem „${slot.projectName}" przejmuje ${recipientName}. ` +
      `Wszelkie pytania i ustalenia prosimy kierować bezpośrednio do niego/niej w tym okresie.\n\n` +
      `Pozdrawiamy,\nZespół Luksystem`;

    const title = `Szkic komunikatu do inwestora: ${slot.projectName}`;
    const body = `SZKIC DO SKOPIOWANIA I WYSŁANIA — nie wysłano automatycznie.\n\n${draftText}`;
    const sourceId = `leave_substitution_client_draft:${input.leaveRequestId}:${slot.projectId}`;
    const linkUrl = "/moja-praca/dostepnosc";

    await admin.from("user_notifications").insert({
      id: crypto.randomUUID(),
      profile_id: recipientId,
      kind: "leave_substitution_client_draft",
      title,
      body,
      link_url: linkUrl,
      source_id: sourceId,
      created_at: new Date().toISOString(),
    });

    try {
      await sendPushToUser(recipientId, {
        title,
        body: `Szkic komunikatu do inwestora gotowy — ${slot.projectName}.`,
        url: linkUrl,
        tag: sourceId,
      });
    } catch {
      // Brak VAPID / subskrypcji — pomijamy.
    }
  }
}
