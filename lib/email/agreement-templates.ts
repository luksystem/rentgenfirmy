import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  formatAgreementCost,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import {
  defaultEmailSettings,
  type EmailSettings,
} from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { absoluteAppUrl } from "@/lib/messages/app-url";

export const AGREEMENT_BINDING_DISCLAIMER =
  defaultEmailSettings().templates.agreement_delivery.disclaimer;

export type AgreementEmailEntry = {
  title: string;
  body: string;
  categoryLabel: string;
  costLabel: string | null;
  costNote: string | null;
  protocols: string[];
  acceptUrl: string | null;
  discussUrl: string | null;
};

export function resolveAgreementPublicUrl(token: string): string {
  if (!token) {
    return "";
  }
  return absoluteAppUrl(`/ustalenie/${token}`);
}

export function agreementAcceptUrl(token: string): string {
  const url = resolveAgreementPublicUrl(token);
  return url ? `${url}?focus=accept` : "";
}

export function agreementDiscussUrl(token: string): string {
  const url = resolveAgreementPublicUrl(token);
  return url ? `${url}?focus=discussion` : "";
}

export function agreementToEmailEntry(
  agreement: ProjectClientAgreement,
): AgreementEmailEntry {
  const costLabel = formatAgreementCost(agreement);
  const token = agreement.publicEnabled && agreement.publicToken ? agreement.publicToken : null;

  return {
    title: agreement.title,
    body: agreement.body,
    categoryLabel: PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category],
    costLabel,
    costNote:
      agreement.costNote?.trim() &&
      agreement.costNote.trim() !== costLabel?.trim()
        ? agreement.costNote.trim()
        : agreement.costNote?.trim() || null,
    protocols: agreement.communicationProtocols ?? [],
    acceptUrl: token ? agreementAcceptUrl(token) : null,
    discussUrl: token ? agreementDiscussUrl(token) : null,
  };
}

function emailButton(href: string, label: string, background: string, color = "#ffffff"): string {
  return `<a href="${href}" style="display:inline-block;margin:6px 10px 6px 0;padding:12px 22px;background:${background};color:${color};text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;line-height:1.2;">${escapeEmailHtml(label)}</a>`;
}

export function renderAgreementBlock(entry: AgreementEmailEntry, index?: number): string {
  const heading =
    index != null
      ? `<h3 style="margin:0 0 8px;font-size:17px;color:#111827;">${index + 1}. ${escapeEmailHtml(entry.title)}</h3>`
      : `<h2 style="margin:0 0 8px;font-size:20px;color:#111827;">${escapeEmailHtml(entry.title)}</h2>`;

  const body = entry.body
    ? `<p style="margin:0 0 12px;color:#374151;white-space:pre-wrap;line-height:1.55;">${escapeEmailHtml(entry.body)}</p>`
    : "";

  const cost = entry.costLabel
    ? `<p style="margin:0 0 6px;color:#111827;"><strong>Koszt:</strong> ${escapeEmailHtml(entry.costLabel)}</p>`
    : "";

  const costNote = entry.costNote
    ? `<p style="margin:0 0 12px;color:#4b5563;"><strong>Notatka do kosztów:</strong> ${escapeEmailHtml(entry.costNote)}</p>`
    : "";

  const protocols = entry.protocols.length
    ? `<p style="margin:0 0 12px;color:#4b5563;"><strong>Protokoły:</strong> ${escapeEmailHtml(entry.protocols.join(", "))}</p>`
    : "";

  const buttons =
    entry.acceptUrl || entry.discussUrl
      ? `<div style="margin:16px 0 4px;">
          ${entry.acceptUrl ? emailButton(entry.acceptUrl, "Przejdź do akceptacji", "#059669") : ""}
          ${entry.discussUrl ? emailButton(entry.discussUrl, "Dyskusja / zmiany", "#2563eb") : ""}
        </div>
        ${
          entry.discussUrl
            ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Jeśli chcesz przekazać więcej informacji lub zmienić coś w ustaleniach, kliknij przycisk „Dyskusja / zmiany”.</p>`
            : ""
        }`
      : `<p style="margin:12px 0 0;color:#b45309;">Brak publicznego linku — skontaktuj się z zespołem projektowym.</p>`;

  return `<div style="margin:0 0 24px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">
    ${heading}
    <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">${escapeEmailHtml(entry.categoryLabel)}</p>
    ${body}
    ${cost}
    ${costNote}
    ${protocols}
    ${buttons}
  </div>`;
}

export function buildAgreementDeliveryEmail(input: {
  recipientName?: string;
  projectName?: string;
  intro: string;
  entries: AgreementEmailEntry[];
  subjectPrefix?: string;
  settings?: EmailSettings;
  company?: CompanyProfileDocument | null;
}) {
  const settings = input.settings ?? defaultEmailSettings();
  const template = settings.templates.agreement_delivery;

  const greeting = input.recipientName?.trim()
    ? `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry ${escapeEmailHtml(input.recipientName.trim())},</p>`
    : `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry,</p>`;

  const projectLine = input.projectName?.trim()
    ? `<p style="margin:0 0 16px;color:#4b5563;">Projekt: <strong style="color:#111827;">${escapeEmailHtml(input.projectName.trim())}</strong></p>`
    : "";

  const blocks = input.entries
    .map((entry, index) =>
      renderAgreementBlock(entry, input.entries.length > 1 ? index : undefined),
    )
    .join("");

  const content = renderEmailTemplateString(
    template.body,
    {
      intro: input.intro,
      project_name: input.projectName?.trim() ?? "",
      agreement_title: input.entries[0]?.title ?? "",
      count: String(input.entries.length),
    },
    {
      greeting,
      project_line: projectLine,
      agreements_block: blocks,
    },
  );

  const html = buildEmailShell({
    content,
    eyebrow: template.eyebrow,
    disclaimer: template.disclaimer,
    brand: settings.brand,
    company: input.company,
  });

  const subjectBase =
    input.entries.length === 1
      ? `Ustalenie do akceptacji: ${input.entries[0].title}`
      : `${input.entries.length} ustaleń do akceptacji${input.projectName ? ` — ${input.projectName}` : ""}`;

  const subject = renderEmailSubject(template.subject, {
    subject_base: subjectBase,
    agreement_title: input.entries[0]?.title ?? "",
    count: String(input.entries.length),
    project_name: input.projectName?.trim() ?? "",
  });

  return {
    subject: input.subjectPrefix ? `${input.subjectPrefix}${subject}` : subject,
    html,
  };
}
