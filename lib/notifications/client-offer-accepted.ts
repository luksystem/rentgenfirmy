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

  if (input.kind === "settlement") {
    // Poza katalogiem powiadomień z ustawień (tylko client_offer_accepted jest w tabeli routingu).
    return;
  }

  // Dynamiczny import — dispatch.ts ciągnie web-push (moduły Node, np. `tls`), a ten plik jest
  // też importowany z lib/supabase/client-offer-repository.ts, uzywanego w komponentach klienckich.
  // Statyczny import wysypałby build przeglądarki ("Module not found: Can't resolve 'tls'").
  const { sendNotificationChannels } = await import("@/lib/notifications/dispatch");
  await sendNotificationChannels({
    actionId: "client_offer_accepted",
    variables: {
      kind_label: "ofertę",
      client_label: clientLabel,
      reference_label: referenceLabel,
    },
    emailRecipients: profiles
      .filter((profile) => profile.email.trim())
      .map((profile) => ({ audience: "user" as const, to: profile.email.trim() })),
    pushUserIds: profiles.map((profile) => profile.id),
    linkUrl: `/oferty/${input.serviceId}`,
    pushTag: sourceId,
  });
}
