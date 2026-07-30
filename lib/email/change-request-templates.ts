import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import {
  formatChangeRequestCost,
  getChangeRequestPublicPath,
  type ProjectChangeRequest,
} from "@/lib/dashboard/change-request-types";
import {
  defaultEmailSettings,
  type EmailSettings,
} from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { absoluteAppUrl } from "@/lib/messages/app-url";

export type ChangeRequestEmailEntry = {
  title: string;
  body: string;
  costLabel: string | null;
  costNote: string | null;
  openUrl: string | null;
};

export function resolveChangeRequestPublicUrl(token: string): string {
  if (!token) {
    return "";
  }
  return absoluteAppUrl(getChangeRequestPublicPath(token));
}

export function changeRequestToEmailEntry(
  changeRequest: ProjectChangeRequest,
): ChangeRequestEmailEntry {
  const costLabel = formatChangeRequestCost(changeRequest);
  const token = changeRequest.publicEnabled && changeRequest.publicToken ? changeRequest.publicToken : null;

  return {
    title: changeRequest.title,
    body: changeRequest.body,
    costLabel,
    costNote:
      changeRequest.costNote?.trim() && changeRequest.costNote.trim() !== costLabel?.trim()
        ? changeRequest.costNote.trim()
        : changeRequest.costNote?.trim() || null,
    openUrl: token ? resolveChangeRequestPublicUrl(token) : null,
  };
}

function emailButton(href: string, label: string, background: string, color = "#ffffff"): string {
  return `<a href="${href}" style="display:inline-block;margin:6px 10px 6px 0;padding:12px 22px;background:${background};color:${color};text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;line-height:1.2;">${escapeEmailHtml(label)}</a>`;
}

export function renderChangeRequestBlock(entry: ChangeRequestEmailEntry, index?: number): string {
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

  const button = entry.openUrl
    ? `<div style="margin:16px 0 4px;">${emailButton(entry.openUrl, "Przejdź do decyzji", "#2563eb")}</div>`
    : `<p style="margin:12px 0 0;color:#b45309;">Brak publicznego linku — skontaktuj się z zespołem projektowym.</p>`;

  return `<div style="margin:0 0 24px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">
    ${heading}
    ${body}
    ${cost}
    ${costNote}
    ${button}
  </div>`;
}

export function buildChangeRequestDeliveryEmail(input: {
  recipientName?: string;
  projectName?: string;
  intro: string;
  entries: ChangeRequestEmailEntry[];
  settings?: EmailSettings;
  company?: CompanyProfileDocument | null;
  /** Osobista notatka nadawcy wpisana przed wysyłką — pokazana w mailu jako wyróżniony akapit. */
  senderNote?: string | null;
}) {
  const settings = input.settings ?? defaultEmailSettings();
  const template = settings.templates.change_request_delivery;

  const greeting = input.recipientName?.trim()
    ? `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry ${escapeEmailHtml(input.recipientName.trim())},</p>`
    : `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry,</p>`;

  const projectLine = input.projectName?.trim()
    ? `<p style="margin:0 0 16px;color:#4b5563;">Projekt: <strong style="color:#111827;">${escapeEmailHtml(input.projectName.trim())}</strong></p>`
    : "";

  const senderNote = input.senderNote?.trim();
  const senderNoteHtml = senderNote
    ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:6px;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeEmailHtml(senderNote)}</p>`
    : "";

  const blocks = input.entries
    .map((entry, index) =>
      renderChangeRequestBlock(entry, input.entries.length > 1 ? index : undefined),
    )
    .join("");

  const content = renderEmailTemplateString(
    template.body,
    {
      intro: input.intro,
      project_name: input.projectName?.trim() ?? "",
      change_request_title: input.entries[0]?.title ?? "",
      count: String(input.entries.length),
    },
    {
      greeting,
      project_line: projectLine,
      sender_note: senderNoteHtml,
      change_requests_block: blocks,
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
      ? `Zmiana do akceptacji: ${input.entries[0].title}`
      : `${input.entries.length} zmian do akceptacji${input.projectName ? ` — ${input.projectName}` : ""}`;

  const subject = renderEmailSubject(template.subject, {
    subject_base: subjectBase,
    change_request_title: input.entries[0]?.title ?? "",
    count: String(input.entries.length),
    project_name: input.projectName?.trim() ?? "",
  });

  return { subject, html };
}
