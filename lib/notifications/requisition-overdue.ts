import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import { rowToRequisition } from "@/lib/supabase/requisition-repository";
import type { UserNotificationKind } from "@/lib/notifications/types";

function todayYmd(now: Date) {
  return now.toISOString().slice(0, 10);
}

async function fetchOverdueRequisitions(now: Date) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("requisitions")
    .select("*")
    .eq("status", "approved")
    .not("order_due_at", "is", null)
    .lt("order_due_at", todayYmd(now));

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToRequisition(row as Parameters<typeof rowToRequisition>[0]));
}

async function wasAlertSent(requisitionId: string, alertDate: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("requisition_overdue_alert_log")
    .select("id")
    .eq("requisition_id", requisitionId)
    .eq("alert_date", alertDate)
    .limit(1);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return false;
    }
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

async function markAlertSent(requisitionId: string, alertDate: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("requisition_overdue_alert_log").insert({
    requisition_id: requisitionId,
    alert_date: alertDate,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return;
    }
    throw new Error(error.message);
  }
}

export async function runRequisitionOrderOverdueAlerts(now = new Date()) {
  const overdue = await fetchOverdueRequisitions(now);
  const alertDate = todayYmd(now);
  let sent = 0;
  let skipped = 0;

  if (!overdue.length) {
    return { scanned: 0, sent, skipped };
  }

  const admin = getSupabaseAdmin();
  const teamProfiles = await fetchTeamProfilesServer().catch(() => []);
  const fallbackRecipientIds = teamProfiles
    .filter((profile) => hasFullAppAccess(profile.role))
    .map((profile) => profile.id);

  for (const requisition of overdue) {
    if (await wasAlertSent(requisition.id, alertDate)) {
      skipped += 1;
      continue;
    }

    const recipientIds = requisition.orderOwnerId
      ? [requisition.orderOwnerId]
      : fallbackRecipientIds;

    if (recipientIds.length > 0) {
      const kind: UserNotificationKind = "requisition_order_overdue";
      const rows = recipientIds.map((profileId) => ({
        id: crypto.randomUUID(),
        profile_id: profileId,
        kind,
        title: "Zapotrzebowanie po terminie zamówienia",
        body: `„${requisition.title}” miało zostać zamówione do ${requisition.orderDueAt}.`,
        link_url: "/zapotrzebowania",
        source_id: `requisition_order_overdue:${requisition.id}:${alertDate}`,
        created_at: new Date().toISOString(),
      }));

      const { error } = await admin.from("user_notifications").insert(rows);
      if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
        console.warn("[requisition-order-overdue] notification failed:", requisition.id, error.message);
      }
    }

    await markAlertSent(requisition.id, alertDate);
    sent += 1;
  }

  return { scanned: overdue.length, sent, skipped };
}
