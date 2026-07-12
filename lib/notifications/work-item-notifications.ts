import type { UserNotificationKind } from "@/lib/notifications/types";
import { workItemLinkUrl } from "@/lib/my-work/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function workItemNotificationLink(workItemId: string) {
  return workItemLinkUrl(workItemId);
}

async function insertWorkItemNotification(input: {
  profileId: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  workItemId: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: input.profileId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    link_url: workItemNotificationLink(input.workItemId),
    source_id: input.workItemId,
    created_at: new Date().toISOString(),
  });

  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

export async function createWorkItemAssignedNotificationServer(input: {
  workItemId: string;
  title: string;
  recipientProfileId: string;
}) {
  await insertWorkItemNotification({
    profileId: input.recipientProfileId,
    kind: "work_item_assigned",
    title: "Nowe zadanie przypisane",
    body: input.title,
    workItemId: input.workItemId,
  });
}

export async function createWorkItemSentNotificationServer(input: {
  workItemId: string;
  title: string;
  recipientProfileId: string;
  managerName: string;
}) {
  await insertWorkItemNotification({
    profileId: input.recipientProfileId,
    kind: "work_item_sent",
    title: `${input.managerName} — plan pracy do zapoznania`,
    body: input.title,
    workItemId: input.workItemId,
  });
}

export async function createWorkItemObstacleNotificationServer(input: {
  workItemId: string;
  title: string;
  recipientProfileId: string;
  obstacleType: string;
  reporterName: string;
}) {
  await insertWorkItemNotification({
    profileId: input.recipientProfileId,
    kind: "work_item_obstacle_reported",
    title: `${input.reporterName} — zgłoszenie przy zadaniu`,
    body: `${input.title} (${input.obstacleType})`,
    workItemId: input.workItemId,
  });
}

export async function createWorkItemVerificationNeededNotificationServer(input: {
  workItemId: string;
  title: string;
  recipientProfileId: string;
  employeeName: string;
}) {
  await insertWorkItemNotification({
    profileId: input.recipientProfileId,
    kind: "work_item_verification_needed",
    title: `${input.employeeName} — zadanie do weryfikacji`,
    body: input.title,
    workItemId: input.workItemId,
  });
}

export async function createWorkItemTakeoverRequestedNotificationServer(input: {
  workItemId: string;
  title: string;
  recipientProfileId: string;
  requesterName: string;
}) {
  await insertWorkItemNotification({
    profileId: input.recipientProfileId,
    kind: "work_item_takeover_requested",
    title: `${input.requesterName} — prośba o przejęcie zadania`,
    body: input.title,
    workItemId: input.workItemId,
  });
}
