import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import type { UserNotificationKind } from "@/lib/notifications/types";

export async function createClientOfferAcceptedNotifications(input: {
  serviceId: string;
  clientName: string;
  serviceTitle: string;
  intakeReference: string | null;
  kind: "estimate" | "settlement";
}) {
  const profiles = await fetchTeamProfilesServer().catch(() => []);
  if (!profiles.length) {
    return;
  }

  const notificationKind: UserNotificationKind =
    input.kind === "settlement" ? "settlement_offer_accepted" : "client_offer_accepted";
  const sourceId = `${notificationKind}:${input.serviceId}`;
  const title =
    input.kind === "settlement"
      ? "Klient zaakceptował rozliczenie"
      : "Klient zaakceptował ofertę";

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("user_notifications")
    .select("id")
    .eq("source_id", sourceId)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return;
  }

  const referenceLabel = input.intakeReference?.trim() || input.serviceTitle.trim() || "Oferta";
  const clientLabel = input.clientName.trim() || "Klient";
  const body = `${clientLabel} — ${referenceLabel}.`;
  const now = new Date().toISOString();

  const rows = profiles.map((profile) => ({
    id: crypto.randomUUID(),
    profile_id: profile.id,
    kind: notificationKind,
    title,
    body,
    link_url: `/oferty/${input.serviceId}`,
    source_id: sourceId,
    created_at: now,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }
}
