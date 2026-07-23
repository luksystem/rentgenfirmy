import {
  isChannelEnabled,
  isEmailAudienceEnabled,
  type NotificationAudience,
} from "@/lib/email/notification-routing";
import type { EmailTemplateKind } from "@/lib/email/email-settings";
import { buildEmailShell } from "@/lib/email/layout";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { sendTransactionalEmail } from "@/lib/email/send";
import { sendPushToUser } from "@/lib/push/send-push";
import { sendSms } from "@/lib/sms/sendSms";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";

/** Podstawienie {{var}} w plain-tekście (SMS/push) — bez HTML-escapowania. */
export function renderPlainTemplateString(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "").trim();
}

export type DispatchEmailRecipient = { audience: NotificationAudience; to: string | string[] };

export type DispatchChannelResult = { channel: "email" | "push" | "sms"; ok: boolean; error?: unknown };

/**
 * Generyczna wysyłka wielokanałowa dla prostych przypadków ("powiadom zespół" / "powiadom jedną
 * osobę"). Nie wymuszać w złożonych, wsadowych flow z własną obsługą idempotencji (np.
 * client_offer_expiring, agreement_delivery) — tam zostaje bezpośrednia orkiestracja.
 */
export async function sendNotificationChannels(input: {
  actionId: EmailTemplateKind;
  /** Zmienne tekstowe do podstawienia we wszystkich kanałach ({{key}}). */
  variables: Record<string, string>;
  /** HTML-owe bloki tylko dla e-mail (np. thread_link) — niedostępne dla sms/push. */
  emailHtmlVariables?: Record<string, string>;
  emailRecipients?: DispatchEmailRecipient[];
  /** user id (profiles.id) — każdy dostaje osobne sendPushToUser. */
  pushUserIds?: string[];
  smsPhone?: string | null;
  linkUrl?: string;
  pushTag?: string;
}): Promise<DispatchChannelResult[]> {
  const settings = await fetchEmailSettingsServer();
  const template = settings.templates[input.actionId];
  const results: DispatchChannelResult[] = [];
  if (!template) {
    return results;
  }

  if (template.emailEnabled && input.emailRecipients?.length) {
    const company = await resolveCompanyProfileDocumentServer().catch(() => null);
    for (const recipient of input.emailRecipients) {
      if (!isEmailAudienceEnabled(settings.routing, input.actionId, recipient.audience)) {
        continue;
      }
      const to = recipient.to;
      if (!to || (Array.isArray(to) && !to.length)) {
        continue;
      }
      try {
        const subject = renderEmailSubject(template.subject, input.variables);
        const html = buildEmailShell({
          content: renderEmailTemplateString(template.body, input.variables, input.emailHtmlVariables ?? {}),
          eyebrow: template.eyebrow,
          disclaimer: template.disclaimer,
          brand: settings.brand,
          company,
        });
        await sendTransactionalEmail({ to, subject, html });
        results.push({ channel: "email", ok: true });
      } catch (error) {
        results.push({ channel: "email", ok: false, error });
        console.warn(`[notifications] ${input.actionId} email failed:`, error);
      }
    }
  }

  if (input.pushUserIds?.length && isChannelEnabled(settings.routing, input.actionId, "push")) {
    const title = renderPlainTemplateString(template.pushTitle, input.variables) || template.label;
    const body = renderPlainTemplateString(template.pushBody, input.variables);
    for (const userId of input.pushUserIds) {
      try {
        await sendPushToUser(userId, { title, body, url: input.linkUrl, tag: input.pushTag });
        results.push({ channel: "push", ok: true });
      } catch (error) {
        results.push({ channel: "push", ok: false, error });
        console.warn(`[notifications] ${input.actionId} push failed:`, error);
      }
    }
  }

  if (
    input.smsPhone?.trim() &&
    !template.smsManagedElsewhere &&
    isChannelEnabled(settings.routing, input.actionId, "sms")
  ) {
    try {
      const message = renderPlainTemplateString(template.sms, input.variables);
      if (message) {
        await sendSms({ phone: input.smsPhone.trim(), message, metadata: { type: input.actionId } });
        results.push({ channel: "sms", ok: true });
      }
    } catch (error) {
      results.push({ channel: "sms", ok: false, error });
      console.warn(`[notifications] ${input.actionId} sms failed:`, error);
    }
  }

  return results;
}
