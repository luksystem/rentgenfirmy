export const USER_NOTIFICATION_KINDS = [
  "kanban_mention",
  "kanban_new_activity",
  "warranty_expiring",
  "agreement_client_created",
  "client_stage_rating",
  "service_intake_preliminary_offer",
  "inspection_billing_due",
  "goal_review_due",
  "goal_period_ending",
  "goal_at_risk",
  "goal_recurring_created",
  "leave_request_created",
  "leave_request_decided",
  "client_offer_accepted",
  "settlement_offer_accepted",
] as const;

export const SALES_NOTIFICATION_KINDS = [
  "client_offer_accepted",
  "settlement_offer_accepted",
] as const satisfies readonly UserNotificationKind[];

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
