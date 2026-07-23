import type { MentionCandidate, UserNotificationKind } from "@/lib/notifications/types";
import { resolveMentionTargets } from "@/lib/notifications/mentions";
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  buildKanbanNewActivityRows,
} from "@/lib/notifications/kanban-activity";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasFullAppAccess } from "@/lib/auth/types";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";

export async function createKanbanMentionNotificationsServer(input: {
  commentId: string;
  taskId: string;
  taskTitle: string;
  body: string;
  authorName: string;
  candidates: MentionCandidate[];
  linkUrl?: string;
}) {
  const mentionTargets = resolveMentionTargets(input.body, input.candidates).filter(
    (target) => normalizeAuthor(target.name) !== normalizeAuthor(input.authorName),
  );

  if (!mentionTargets.length) {
    return;
  }

  const profileIds = new Set<string>();
  const supabase = getSupabaseAdmin();
  for (const target of mentionTargets) {
    if (target.kind === "role" || target.roleItemId) {
      if (!target.roleItemId) {
        continue;
      }
      const { data, error } = await supabase
        .from("user_operational_roles")
        .select("user_id")
        .eq("role_item_id", target.roleItemId);
      if (error) {
        throw new Error(error.message);
      }
      for (const row of data ?? []) {
        profileIds.add(row.user_id as string);
      }
      continue;
    }
    if (target.profileId) {
      profileIds.add(target.profileId);
    }
  }

  if (!profileIds.size) {
    return;
  }

  const excerpt = input.body.trim().slice(0, NOTIFICATION_BODY_MAX_LENGTH);
  const rows = [...profileIds].map((profileId) => ({
    id: crypto.randomUUID(),
    profile_id: profileId,
    kind: "kanban_mention" as UserNotificationKind,
    title: `${input.authorName} oznaczył Cię w Kanbanie`,
    body: `${input.taskTitle}: ${excerpt}`,
    link_url: input.linkUrl ?? "/tablice-wdrozen",
    source_id: input.commentId,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

export async function createKanbanNewActivityNotificationsServer(input: {
  sourceId: string;
  taskTitle: string;
  authorName: string;
  body: string;
  linkUrl?: string;
  excludeProfileIds?: string[];
  teamProfileIds?: string[];
}) {
  const teamProfileIds =
    input.teamProfileIds ??
    (await fetchTeamProfilesServer().catch(() => [])).map((profile) => profile.id);

  if (!teamProfileIds.length) {
    return;
  }

  const rows = buildKanbanNewActivityRows({
    teamProfileIds,
    sourceId: input.sourceId,
    taskTitle: input.taskTitle,
    authorName: input.authorName,
    body: input.body,
    linkUrl: input.linkUrl,
    excludeProfileIds: input.excludeProfileIds,
  });

  if (!rows.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

function normalizeAuthor(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

/** Powiadomienie dla przełożonego + administratorów o nowym wniosku urlopowym (sekcja „Pracownicy”). */
export async function createLeaveRequestCreatedNotificationsServer(input: {
  leaveRequestId: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  recipientProfileIds: string[];
  linkUrl?: string;
}) {
  const recipients = Array.from(new Set(input.recipientProfileIds.filter(Boolean)));
  if (!recipients.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const title = `${input.employeeName} — wniosek o urlop`;
  const body = `${input.leaveTypeName}: ${input.startDate} — ${input.endDate}. Wymaga akceptacji.`;
  const now = new Date().toISOString();
  const rows = recipients.map((profileId) => ({
    id: crypto.randomUUID(),
    profile_id: profileId,
    kind: "leave_request_created" as UserNotificationKind,
    title,
    body,
    link_url: input.linkUrl ?? "/pracownicy/urlopy",
    source_id: input.leaveRequestId,
    created_at: now,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

/** Powiadomienie dla pracownika o decyzji (akceptacja/odrzucenie) w sprawie jego wniosku. */
export async function createLeaveRequestDecidedNotificationServer(input: {
  leaveRequestId: string;
  employeeProfileId: string;
  approved: boolean;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  decisionNote?: string;
  linkUrl?: string;
}) {
  const supabase = getSupabaseAdmin();
  const title = input.approved
    ? `Twój urlop został zaakceptowany`
    : `Twój wniosek o urlop został odrzucony`;
  const bodyParts = [`${input.leaveTypeName}: ${input.startDate} — ${input.endDate}.`];
  if (!input.approved && input.decisionNote?.trim()) {
    bodyParts.push(`Powód: ${input.decisionNote.trim()}`);
  }

  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: input.employeeProfileId,
    kind: "leave_request_decided" as UserNotificationKind,
    title,
    body: bodyParts.join(" "),
    link_url: input.linkUrl ?? "/moja-praca/dostepnosc",
    source_id: input.leaveRequestId,
    created_at: new Date().toISOString(),
  });

  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

/** Powiadomienie dla manager/admin, że pracownik złożył samoocenę miesięczną — można go ocenić. */
export async function createMonthlyReviewSelfSubmittedNotificationServer(input: {
  employeeId: string;
  employeeName: string;
  periodMonth: string;
}) {
  const teamProfiles = await fetchTeamProfilesServer();
  const recipients = teamProfiles
    .filter((profile) => hasFullAppAccess(profile.role) && profile.id !== input.employeeId)
    .map((profile) => profile.id);

  if (!recipients.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const title = `${input.employeeName} — samoocena miesięczna`;
  const body = `Złożył/-a samoocenę za ${formatPeriodMonthLabel(input.periodMonth)}. Możesz ją teraz ocenić.`;
  const now = new Date().toISOString();
  const rows = recipients.map((profileId) => ({
    id: crypto.randomUUID(),
    profile_id: profileId,
    kind: "monthly_review_self_submitted" as UserNotificationKind,
    title,
    body,
    link_url: "/pracownicy/oceny-miesieczne",
    source_id: input.employeeId,
    created_at: now,
  }));

  const { error: insertError } = await supabase.from("user_notifications").insert(rows);
  if (insertError && !insertError.message.toLowerCase().includes("does not exist")) {
    throw new Error(insertError.message);
  }
}

const OFFER_KIND_LABELS = { estimate: "wycenę", settlement: "rozliczenie" } as const;

/** Powiadomienie dla wskazanego administratora — pracownik prosi o akceptację przed wysyłką do klienta. */
export async function createOfferApprovalRequestedNotificationServer(input: {
  serviceId: string;
  kind: "estimate" | "settlement";
  requestedByName: string;
  serviceTitle: string;
  assignedAdminId: string;
}) {
  const supabase = getSupabaseAdmin();
  const title = `${input.requestedByName} prosi o akceptację`;
  const body = `${OFFER_KIND_LABELS[input.kind]} „${input.serviceTitle}” czeka na Twoją akceptację przed wysyłką do klienta.`;

  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: input.assignedAdminId,
    kind: "offer_approval_requested" as UserNotificationKind,
    title,
    body,
    link_url: `/oferty/${input.serviceId}`,
    source_id: input.serviceId,
    created_at: new Date().toISOString(),
  });

  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}

/** Powiadomienie dla wnioskodawcy — administrator zaakceptował, zadał pytanie albo wysłał do klienta. */
export async function createOfferApprovalReviewedNotificationServer(input: {
  serviceId: string;
  kind: "estimate" | "settlement";
  requestedById: string;
  serviceTitle: string;
  outcome: "approved" | "question" | "sent";
  note?: string;
}) {
  const supabase = getSupabaseAdmin();
  const kindLabel = OFFER_KIND_LABELS[input.kind];
  const title =
    input.outcome === "approved"
      ? `Zaakceptowano — możesz wysłać ${kindLabel}`
      : input.outcome === "question"
        ? `Pytanie do Twojej ${kindLabel === "wycenę" ? "wyceny" : "rozliczenia"}`
        : `Wysłano ${kindLabel} do klienta`;
  const bodyParts = [`„${input.serviceTitle}”.`];
  if (input.outcome === "question" && input.note?.trim()) {
    bodyParts.push(input.note.trim());
  }

  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: input.requestedById,
    kind: "offer_approval_reviewed" as UserNotificationKind,
    title,
    body: bodyParts.join(" "),
    link_url: `/oferty/${input.serviceId}`,
    source_id: input.serviceId,
    created_at: new Date().toISOString(),
  });

  if (error && !error.message.toLowerCase().includes("does not exist")) {
    throw new Error(error.message);
  }
}
