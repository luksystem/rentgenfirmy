import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import {
  defaultEmailSettings,
  type EmailSettings,
} from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import {
  SERVICE_INTAKE_RESOLUTION_OUTCOME_LABELS,
  type ServiceIntakeResolutionOutcome,
} from "@/lib/service-intake/types";

export function getServiceIntakeThreadUrl(trackingToken: string) {
  return absoluteAppUrl(`/zgloszenie/watek/${trackingToken}`);
}

function threadLinkHtml(threadUrl: string) {
  return `<p style="margin:0 0 16px;"><a href="${escapeEmailHtml(threadUrl)}" style="color:#2563eb;word-break:break-all;">${escapeEmailHtml(threadUrl)}</a></p>`;
}

export type ServiceIntakeSettlementInfo = {
  resolutionOutcome: ServiceIntakeResolutionOutcome | null;
  resolutionCause: string | null;
  extraCosts: boolean | null;
  extraCostsNote: string | null;
};

function buildSettlementInfoHtml(info?: ServiceIntakeSettlementInfo | null) {
  if (!info || !info.resolutionOutcome) {
    return "";
  }

  const rows: string[] = [
    `<tr>
      <td style="padding:6px 0;color:#374151;">Udało się rozwiązać sprawę?</td>
      <td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${escapeEmailHtml(
        SERVICE_INTAKE_RESOLUTION_OUTCOME_LABELS[info.resolutionOutcome],
      )}</td>
    </tr>`,
  ];

  if (info.resolutionCause?.trim()) {
    rows.push(
      `<tr>
        <td colspan="2" style="padding:8px 0 0;color:#374151;">
          <span style="color:#6b7280;">Notatka:</span><br />
          <span style="white-space:pre-wrap;">${escapeEmailHtml(info.resolutionCause.trim())}</span>
        </td>
      </tr>`,
    );
  }

  rows.push(
    `<tr>
      <td style="padding:8px 0 0;color:#374151;">Koszty dodatkowe?</td>
      <td style="padding:8px 0 0;text-align:right;font-weight:600;color:#111827;">${
        info.extraCosts ? "Tak" : "Nie"
      }</td>
    </tr>`,
  );

  if (info.extraCosts && info.extraCostsNote?.trim()) {
    rows.push(
      `<tr>
        <td colspan="2" style="padding:8px 0 0;color:#374151;">
          <span style="color:#6b7280;">Notatka o kosztach dodatkowych:</span><br />
          <span style="white-space:pre-wrap;">${escapeEmailHtml(info.extraCostsNote.trim())}</span>
        </td>
      </tr>`,
    );
  }

  return `<div style="margin:0 0 16px;padding:14px 16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
    <h2 style="font-size:15px;margin:0 0 8px;color:#065f46;">Podsumowanie rozliczenia</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows.join("")}</table>
  </div>`;
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
    settlement?: ServiceIntakeSettlementInfo | null;
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
  const settlementHtml = buildSettlementInfoHtml(input.settlement);

  return {
    subject: renderEmailSubject(template.subject, textVars),
    html: buildEmailShell({
      content:
        settlementHtml +
        renderEmailTemplateString(template.body, textVars, {
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
