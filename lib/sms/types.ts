export const SMS_PROVIDERS = ["smsapi", "twilio", "serwersms"] as const;

export type SmsProviderName = (typeof SMS_PROVIDERS)[number];

export const SMS_MESSAGE_STATUSES = ["queued", "sent", "failed", "delivered"] as const;

export type SmsMessageStatus = (typeof SMS_MESSAGE_STATUSES)[number];

export type SmsMetadata = Record<string, unknown>;

export type SmsMessageRecord = {
  id: string;
  recipient_phone: string;
  message: string;
  provider: SmsProviderName;
  provider_message_id: string | null;
  status: SmsMessageStatus;
  error_message: string | null;
  metadata: SmsMetadata;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type SendSmsInput = {
  phone: string;
  message: string;
  metadata?: SmsMetadata;
};

export type SendSmsResult = {
  id: string;
  status: SmsMessageStatus;
  provider: SmsProviderName;
  providerMessageId: string | null;
  errorMessage: string | null;
};

export type SmsSendPayload = {
  to: string;
  message: string;
  from: string;
  notifyUrl?: string;
  test?: boolean;
};

export type SmsSendProviderResult = {
  providerMessageId: string | null;
  providerStatus: string | null;
  rawResponse: unknown;
};

export type SmsProvider = {
  name: SmsProviderName;
  send(payload: SmsSendPayload): Promise<SmsSendProviderResult>;
};

export type SmsStatusWebhookUpdate = {
  providerMessageId: string;
  providerStatus: string | null;
  providerStatusName: string | null;
  deliveredAt: string | null;
  failed: boolean;
};
