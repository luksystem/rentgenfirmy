import { getAppBaseUrl } from "@/lib/messages/app-url";
import type { SmsProviderName } from "@/lib/sms/types";

function readProviderName(): SmsProviderName {
  const value = (process.env.SMS_PROVIDER ?? "smsapi").trim().toLowerCase();
  if (value === "smsapi" || value === "twilio" || value === "serwersms") {
    return value;
  }
  return "smsapi";
}

export function getSmsConfig() {
  const appUrl = getAppBaseUrl();

  return {
    provider: readProviderName(),
    smsapiToken: process.env.SMSAPI_TOKEN?.trim() ?? "",
    smsapiFrom: process.env.SMSAPI_FROM?.trim() || "Luksystem",
    testPhone: process.env.SMS_TEST_PHONE?.trim() ?? "",
    webhookSecret: process.env.SMS_WEBHOOK_SECRET?.trim() ?? "",
    notifyUrl: `${appUrl}/api/sms/status-webhook`,
    testMode: process.env.SMSAPI_TEST_MODE === "1" || process.env.NODE_ENV !== "production",
  };
}

export function isSmsConfigured() {
  const config = getSmsConfig();
  if (config.provider === "smsapi") {
    return Boolean(config.smsapiToken);
  }
  return false;
}
