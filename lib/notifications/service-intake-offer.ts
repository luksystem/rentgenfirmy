import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";

export async function createServiceIntakePreliminaryOfferNotifications(input: {
  intakeId: string;
  serviceId: string;
  referenceNumber: string;
  clientName: string;
  projectName: string;
  estimatedNetTotal: number;
}) {
  const profiles = await fetchTeamProfilesServer().catch(() => []);
  if (!profiles.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const body = `${input.clientName} — ${input.projectName}. Orientacyjnie ${input.estimatedNetTotal.toFixed(2)} zł netto. Wymaga doprecyzowania i wysłania oferty.`;

  const rows = profiles.map((profile) => ({
    id: crypto.randomUUID(),
    profile_id: profile.id,
    kind: "service_intake_preliminary_offer",
    title: `Klient prosi o ofertę (${input.referenceNumber})`,
    body,
    link_url: `/oferty/${input.serviceId}`,
    source_id: input.intakeId,
    created_at: now,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }
}
