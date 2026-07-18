import { sendPushToUser } from "@/lib/push/send-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createServiceIntakeAssignedNotificationServer(input: {
  intakeId: string;
  recipientProfileId: string;
  referenceNumber: string;
  clientLabel: string;
  projectLabel?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const subject = [input.clientLabel, input.projectLabel?.trim()].filter(Boolean).join(" · ");
  const title = `Serwis do przyjęcia (${input.referenceNumber})`;
  const body = subject
    ? `${subject}. Zapoznaj się ze zgłoszeniem i kliknij PRZYJMIJ — dopiero wtedy jest w realizacji.`
    : `Zapoznaj się ze zgłoszeniem i kliknij PRZYJMIJ — dopiero wtedy jest w realizacji.`;
  const linkUrl = "/oferty/zgloszenia";

  const { error } = await supabase.from("user_notifications").insert({
    id,
    profile_id: input.recipientProfileId,
    kind: "service_intake_assigned",
    title,
    body,
    link_url: linkUrl,
    source_id: input.intakeId,
    created_at: now,
  });

  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }

  try {
    await sendPushToUser(input.recipientProfileId, {
      title,
      body,
      url: linkUrl,
      tag: `service_intake_assigned:${input.intakeId}`,
      notificationId: id,
    });
  } catch {
    // Brak VAPID / subskrypcji — dzwonek i tak zapisany.
  }
}
