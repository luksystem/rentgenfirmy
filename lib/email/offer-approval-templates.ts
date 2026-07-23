import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import type { EmailBrandSettings } from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";

const KIND_LABEL = { estimate: "wycena", settlement: "rozliczenie" } as const;

export function buildOfferApprovalRequestedEmail(input: {
  requestedByName: string;
  serviceTitle: string;
  kind: "estimate" | "settlement";
  link: string;
  brand: EmailBrandSettings;
  company?: CompanyProfileDocument | null;
}) {
  const kindLabel = KIND_LABEL[input.kind];
  const subject = `${input.requestedByName} prosi o akceptację — ${input.serviceTitle}`;

  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      <strong>${escapeEmailHtml(input.requestedByName)}</strong> prosi o akceptację ${kindLabel === "wycena" ? "wyceny" : "rozliczenia"}
      przed wysyłką do klienta:
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#111827;">
      <strong>${escapeEmailHtml(input.serviceTitle)}</strong>
    </p>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(input.link)}"
         style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
        Otwórz i zdecyduj
      </a>
    </p>
  `;

  return {
    subject,
    html: buildEmailShell({
      content,
      eyebrow: "Akceptacja wymagana",
      brand: input.brand,
      company: input.company,
    }),
  };
}
