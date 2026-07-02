import { getSmsConfig } from "@/lib/sms/config";
import { createSmsApiProvider } from "@/lib/sms/providers/smsapiProvider";
import type { SmsProvider, SmsProviderName } from "@/lib/sms/types";

export function getSmsProvider(providerName?: SmsProviderName): SmsProvider {
  const name = providerName ?? getSmsConfig().provider;

  switch (name) {
    case "smsapi":
      return createSmsApiProvider();
    case "twilio":
      throw new Error("Provider Twilio nie jest jeszcze skonfigurowany.");
    case "serwersms":
      throw new Error("Provider SerwerSMS nie jest jeszcze skonfigurowany.");
    default:
      return createSmsApiProvider();
  }
}
