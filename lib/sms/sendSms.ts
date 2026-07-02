import { getSmsConfig } from "@/lib/sms/config";
import { getSmsProvider } from "@/lib/sms/smsProvider";
import type { SendSmsInput, SendSmsResult } from "@/lib/sms/types";
import { validateSmsMessage, validateSmsPhone } from "@/lib/sms/validate";
import {
  createQueuedSmsMessage,
  markSmsMessageFailed,
  markSmsMessageSent,
} from "@/lib/supabase/sms-repository";

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const phoneValidation = validateSmsPhone(input.phone);
  if (!phoneValidation.ok) {
    throw new Error(phoneValidation.error);
  }

  const messageValidation = validateSmsMessage(input.message);
  if (!messageValidation.ok) {
    throw new Error(messageValidation.error);
  }

  const config = getSmsConfig();
  const provider = getSmsProvider(config.provider);

  const queued = await createQueuedSmsMessage({
    recipientPhone: phoneValidation.display,
    message: messageValidation.message,
    provider: provider.name,
    metadata: input.metadata ?? {},
  });

  try {
    const providerResult = await provider.send({
      to: phoneValidation.normalized,
      message: messageValidation.message,
      from: config.smsapiFrom,
      notifyUrl: config.notifyUrl,
      test: config.testMode,
    });

    const sent = await markSmsMessageSent({
      id: queued.id,
      providerMessageId: providerResult.providerMessageId,
    });

    return {
      id: sent.id,
      status: sent.status,
      provider: sent.provider,
      providerMessageId: sent.provider_message_id,
      errorMessage: sent.error_message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Nie udało się wysłać SMS.";
    const failed = await markSmsMessageFailed({
      id: queued.id,
      errorMessage,
    });

    return {
      id: failed.id,
      status: failed.status,
      provider: failed.provider,
      providerMessageId: failed.provider_message_id,
      errorMessage: failed.error_message,
    };
  }
}
