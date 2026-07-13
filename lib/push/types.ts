export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  notificationId?: string;
};

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  keys: PushSubscriptionKeys;
  deviceName?: string;
  platform?: string;
};

export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  deviceName: string | null;
  platform: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type SendPushResult = {
  sent: number;
  failed: number;
  removed: number;
};

export const PUSH_TITLE_MAX_LENGTH = 120;
export const PUSH_BODY_MAX_LENGTH = 500;
export const PUSH_TEST_RATE_LIMIT_MS = 60_000;
