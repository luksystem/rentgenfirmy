export const USER_NOTIFICATION_KINDS = [
  "kanban_mention",
  "kanban_new_activity",
  "warranty_expiring",
  "agreement_client_created",
  "client_stage_rating",
  "service_intake_preliminary_offer",
] as const;

export type UserNotificationKind = (typeof USER_NOTIFICATION_KINDS)[number];

export type UserNotification = {
  id: string;
  profileId: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  linkUrl: string | null;
  sourceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type MentionCandidate = {
  profileId: string | null;
  name: string;
};
