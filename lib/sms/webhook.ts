import type { SmsMessageStatus, SmsStatusWebhookUpdate } from "@/lib/sms/types";

const DELIVERED_STATUS_NAMES = new Set(["DELIVERED"]);
const FAILED_STATUS_NAMES = new Set(["UNDELIVERED", "EXPIRED", "REJECTED", "FAILED", "NOT_FOUND"]);
const SENT_STATUS_NAMES = new Set(["SENT", "QUEUE", "ACCEPTED"]);

export function parseSmsApiWebhookPayload(input: Record<string, string | string[] | undefined>) {
  const msgIdRaw = input.MsgId ?? input.msgId ?? input.id;
  const statusNameRaw = input.status_name ?? input.statusName;
  const doneDateRaw = input.donedate ?? input.doneDate;

  const msgIds = splitCallbackValue(msgIdRaw);
  const statusNames = splitCallbackValue(statusNameRaw);
  const doneDates = splitCallbackValue(doneDateRaw);

  const updates: SmsStatusWebhookUpdate[] = [];

  for (let index = 0; index < msgIds.length; index += 1) {
    const providerMessageId = msgIds[index]?.trim();
    if (!providerMessageId) {
      continue;
    }

    const providerStatusName = statusNames[index]?.trim().toUpperCase() || null;
    const doneDateValue = doneDates[index]?.trim();
    const deliveredAt = doneDateValue ? unixToIso(doneDateValue) : null;

    updates.push({
      providerMessageId,
      providerStatus: input.status ? splitCallbackValue(input.status)[index] ?? null : null,
      providerStatusName,
      deliveredAt,
      failed: providerStatusName ? FAILED_STATUS_NAMES.has(providerStatusName) : false,
    });
  }

  return updates;
}

export function mapWebhookUpdateToStatus(update: SmsStatusWebhookUpdate): SmsMessageStatus {
  if (update.failed) {
    return "failed";
  }

  if (update.providerStatusName && DELIVERED_STATUS_NAMES.has(update.providerStatusName)) {
    return "delivered";
  }

  if (update.providerStatusName && SENT_STATUS_NAMES.has(update.providerStatusName)) {
    return "sent";
  }

  return "sent";
}

function splitCallbackValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => String(entry).split(","));
  }
  if (!value) {
    return [];
  }
  return String(value).split(",");
}

function unixToIso(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}
