import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { escapeCompanyHtml } from "@/lib/company/company-profile-document";
import type { EmailBrandSettings } from "@/lib/email/email-settings";

export function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailCompanyFooterHtml(
  company: CompanyProfileDocument | null | undefined,
  footerNote: string,
) {
  if (!company) {
    return footerNote.trim()
      ? `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">${escapeEmailHtml(footerNote.trim())}</p>`
      : "";
  }

  const logo = company.logoUrl
    ? `<img src="${escapeCompanyHtml(company.logoUrl)}" alt="${escapeCompanyHtml(company.displayName)}" style="max-height:40px;max-width:160px;width:auto;height:auto;display:block;margin:0 auto 10px;" />`
    : "";

  const lines = (company.footerLines.length ? company.footerLines : [company.displayName])
    .map(
      (line) =>
        `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.45;">${escapeEmailHtml(line)}</p>`,
    )
    .join("");

  const note = footerNote.trim()
    ? `<p style="margin:10px 0 0;font-size:11px;color:#9ca3af;line-height:1.45;">${escapeEmailHtml(footerNote.trim())}</p>`
    : "";

  return `<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
    ${logo}
    ${lines}
    ${note}
  </div>`;
}

export function buildEmailShell(input: {
  content: string;
  eyebrow?: string;
  disclaimer?: string;
  signOff?: string;
  brand: EmailBrandSettings;
  company?: CompanyProfileDocument | null;
}) {
  const eyebrow = input.eyebrow?.trim();
  const disclaimer = input.disclaimer?.trim();
  const signOff = (input.signOff ?? input.brand.signOff).trim();
  const signOffHtml = signOff
    ? `<p style="margin:24px 0 0;font-size:13px;color:#9ca3af;white-space:pre-line;">${escapeEmailHtml(signOff)}</p>`
    : "";

  const disclaimerHtml = disclaimer
    ? `<div style="margin-top:28px;padding:16px;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.55;white-space:pre-wrap;">${escapeEmailHtml(disclaimer)}</p>
      </div>`
    : "";

  const footerHtml = input.brand.showCompanyFooter
    ? buildEmailCompanyFooterHtml(input.company, input.brand.footerNote)
    : input.brand.footerNote.trim()
      ? `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">${escapeEmailHtml(input.brand.footerNote.trim())}</p>`
      : "";

  const from = escapeEmailHtml(input.brand.headerColorFrom || "#0f172a");
  const to = escapeEmailHtml(input.brand.headerColorTo || "#1e293b");

  return `<!DOCTYPE html>
<html lang="pl">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 28px 8px;background:linear-gradient(135deg,${from},${to});color:#ffffff;">
                ${
                  eyebrow
                    ? `<p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.75;">${escapeEmailHtml(eyebrow)}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                ${input.content}
                ${disclaimerHtml}
                ${signOffHtml}
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
