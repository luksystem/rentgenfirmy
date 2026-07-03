import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  formatAgreementCost,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";

export const AGREEMENT_BINDING_DISCLAIMER =
  "Zaakceptowane ustalenia są wiążące na dalszych etapach realizacji projektu. Prosimy o dokładne zapoznanie się z treścią przed akceptacją.";

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
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!token) {
    return "";
  }
  return `${base}/ustalenie/${token}`;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailButton(href: string, label: string, background: string, color = "#ffffff"): string {
  return `<a href="${href}" style="display:inline-block;margin:6px 10px 6px 0;padding:12px 22px;background:${background};color:${color};text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;line-height:1.2;">${escapeHtml(label)}</a>`;
}

function renderAgreementBlock(entry: AgreementEmailEntry, index?: number): string {
  const heading =
    index != null
      ? `<h3 style="margin:0 0 8px;font-size:17px;color:#111827;">${index + 1}. ${escapeHtml(entry.title)}</h3>`
      : `<h2 style="margin:0 0 8px;font-size:20px;color:#111827;">${escapeHtml(entry.title)}</h2>`;

  const body = entry.body
    ? `<p style="margin:0 0 12px;color:#374151;white-space:pre-wrap;line-height:1.55;">${escapeHtml(entry.body)}</p>`
    : "";

  const cost = entry.costLabel
    ? `<p style="margin:0 0 6px;color:#111827;"><strong>Koszt:</strong> ${escapeHtml(entry.costLabel)}</p>`
    : "";

  const costNote = entry.costNote
    ? `<p style="margin:0 0 12px;color:#4b5563;"><strong>Notatka do kosztów:</strong> ${escapeHtml(entry.costNote)}</p>`
    : "";

  const protocols = entry.protocols.length
    ? `<p style="margin:0 0 12px;color:#4b5563;"><strong>Protokoły:</strong> ${escapeHtml(entry.protocols.join(", "))}</p>`
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
    <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(entry.categoryLabel)}</p>
    ${body}
    ${cost}
    ${costNote}
    ${protocols}
    ${buttons}
  </div>`;
}

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 28px 8px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.75;">Ustalenia projektowe</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                ${content}
                <div style="margin-top:28px;padding:16px;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:8px;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.55;">${escapeHtml(AGREEMENT_BINDING_DISCLAIMER)}</p>
                </div>
                <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">Pozdrawiamy,<br />Zespół projektowy</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildAgreementDeliveryEmail(input: {
  recipientName?: string;
  projectName?: string;
  intro: string;
  entries: AgreementEmailEntry[];
  subjectPrefix?: string;
}) {
  const greeting = input.recipientName?.trim()
    ? `Dzień dobry ${escapeHtml(input.recipientName.trim())},`
    : "Dzień dobry,";

  const projectLine = input.projectName?.trim()
    ? `<p style="margin:0 0 16px;color:#4b5563;">Projekt: <strong style="color:#111827;">${escapeHtml(input.projectName.trim())}</strong></p>`
    : "";

  const blocks = input.entries.map((entry, index) => renderAgreementBlock(entry, input.entries.length > 1 ? index : undefined)).join("");

  const html = emailShell(`
    <p style="margin:0 0 12px;font-size:16px;color:#111827;">${greeting}</p>
    <p style="margin:0 0 16px;color:#374151;line-height:1.55;">${escapeHtml(input.intro)}</p>
    ${projectLine}
    ${blocks}
  `);

  const subjectBase =
    input.entries.length === 1
      ? `Ustalenie do akceptacji: ${input.entries[0].title}`
      : `${input.entries.length} ustaleń do akceptacji${input.projectName ? ` — ${input.projectName}` : ""}`;

  return {
    subject: input.subjectPrefix ? `${input.subjectPrefix}${subjectBase}` : subjectBase,
    html,
  };
}
