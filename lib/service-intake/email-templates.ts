import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import {
  defaultEmailSettings,
  type EmailSettings,
} from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";

export function getServiceIntakeThreadUrl(trackingToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/zgloszenie/watek/${trackingToken}`;
}

function threadLinkHtml(threadUrl: string) {
  return `<p style="margin:0 0 16px;"><a href="${escapeEmailHtml(threadUrl)}" style="color:#2563eb;word-break:break-all;">${escapeEmailHtml(threadUrl)}</a></p>`;
}

export function buildServiceIntakeSubmittedEmail(
  input: {
    referenceNumber: string;
    contactFullName: string;
    threadUrl: string;
  },
  options?: {
    settings?: EmailSettings;
    company?: CompanyProfileDocument | null;
  },
) {
  const settings = options?.settings ?? defaultEmailSettings();
  const template = settings.templates.service_intake_submitted;
  const textVars = {
    recipient_name: input.contactFullName,
    reference_number: input.referenceNumber,
    thread_url: input.threadUrl,
  };

  return {
    subject: renderEmailSubject(template.subject, textVars),
    html: buildEmailShell({
      content: renderEmailTemplateString(template.body, textVars, {
        thread_link: threadLinkHtml(input.threadUrl),
      }),
      eyebrow: template.eyebrow,
      disclaimer: template.disclaimer,
      brand: settings.brand,
      company: options?.company,
    }),
  };
}

export function buildServiceIntakeStatusEmail(
  input: {
    referenceNumber: string;
    contactFullName: string;
    statusLabel: string;
    threadUrl: string;
  },
  options?: {
    settings?: EmailSettings;
    company?: CompanyProfileDocument | null;
  },
) {
  const settings = options?.settings ?? defaultEmailSettings();
  const template = settings.templates.service_intake_status;
  const textVars = {
    recipient_name: input.contactFullName,
    reference_number: input.referenceNumber,
    status_label: input.statusLabel,
    thread_url: input.threadUrl,
  };

  return {
    subject: renderEmailSubject(template.subject, textVars),
    html: buildEmailShell({
      content: renderEmailTemplateString(template.body, textVars, {
        thread_link: threadLinkHtml(input.threadUrl),
      }),
      eyebrow: template.eyebrow,
      disclaimer: template.disclaimer,
      brand: settings.brand,
      company: options?.company,
    }),
  };
}

export function getServiceInboxRecipients(settings?: EmailSettings) {
  const email =
    settings?.serviceInboxEmail?.trim() || defaultEmailSettings().serviceInboxEmail;
  return [email];
}
