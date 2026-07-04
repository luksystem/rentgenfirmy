import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchInspectionGlobalSettings } from "@/lib/supabase/inspection-server";

export async function createInspectionBillingNotification(input: {
  inspectionId: string;
  clientName: string;
  systemLabel: string;
  confirmedDate: string | null;
}) {
  const settings = await fetchInspectionGlobalSettings();
  const profileId = settings.billingResponsibleProfileId;

  if (!profileId) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const dateLabel = input.confirmedDate ?? "bez daty";

  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: profileId,
    kind: "inspection_billing_due",
    title: `Przegląd do rozliczenia — ${input.systemLabel}`,
    body: `${input.clientName} · termin ${dateLabel}. Przegląd zrealizowany — wymaga rozliczenia.`,
    link_url: `/przeglady?inspection=${input.inspectionId}`,
    source_id: input.inspectionId,
    created_at: now,
  });

  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }
}
