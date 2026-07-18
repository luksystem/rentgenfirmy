import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import type { EmailBrandSettings } from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { formatDate } from "@/lib/utils";

export function buildOfferExpiryReminderEmail(input: {
  clientName: string;
  offerTitle: string;
  expiresAt: string;
  offerUrl: string;
  kind: "estimate" | "settlement";
  brand: EmailBrandSettings;
  company?: CompanyProfileDocument | null;
}) {
  const name = input.clientName.trim() || "Państwo";
  const title = input.offerTitle.trim() || "oferta";
  const expiresLabel = formatDate(input.expiresAt);
  const kindLabel = input.kind === "settlement" ? "rozliczenie" : "oferta";

  const subject =
    input.kind === "settlement"
      ? `Rozliczenie wygasa ${expiresLabel}: ${title}`
      : `Oferta wygasa ${expiresLabel}: ${title}`;

  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Dzień dobry ${escapeEmailHtml(name)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Przypominamy, że ${kindLabel}
      <strong>${escapeEmailHtml(title)}</strong>
      straci ważność
      <strong>${escapeEmailHtml(expiresLabel)}</strong>.
      Po tym terminie trzeba będzie renegocjować jej warunki.
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#111827;">
      Możesz zaakceptować ${kindLabel === "rozliczenie" ? "rozliczenie" : "ofertę"} pod poniższym linkiem:
    </p>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(input.offerUrl)}"
         style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
        Otwórz i zaakceptuj
      </a>
    </p>
    <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#6b7280;word-break:break-all;">
      ${escapeEmailHtml(input.offerUrl)}
    </p>
  `;

  return {
    subject,
    html: buildEmailShell({
      content,
      eyebrow: input.kind === "settlement" ? "Rozliczenie" : "Oferta",
      disclaimer:
        "Po upływie terminu ważności link przestanie działać — warunki będzie trzeba ustalić na nowo.",
      brand: input.brand,
      company: input.company,
    }),
  };
}

export function buildOfferExpiryReminderSms(input: {
  offerTitle: string;
  expiresAt: string;
  offerUrl: string;
  kind: "estimate" | "settlement";
}) {
  const title = input.offerTitle.trim() || (input.kind === "settlement" ? "rozliczenie" : "oferta");
  const expiresLabel = formatDate(input.expiresAt);
  const label = input.kind === "settlement" ? "Rozliczenie" : "Oferta";
  return `${label} "${title}" wygasa ${expiresLabel}. Potem trzeba renegocjowac warunki. Akceptacja: ${input.offerUrl}`;
}

export function buildOfferExpiryReminderPush(input: {
  offerTitle: string;
  expiresAt: string;
  kind: "estimate" | "settlement";
}) {
  const title = input.offerTitle.trim() || (input.kind === "settlement" ? "rozliczenie" : "oferta");
  const expiresLabel = formatDate(input.expiresAt);
  return {
    title:
      input.kind === "settlement"
        ? `Rozliczenie wygasa: ${title}`
        : `Oferta wygasa: ${title}`,
    body: `Ważność do ${expiresLabel}. Po terminie trzeba renegocjować warunki. Otwórz link, aby zaakceptować.`,
  };
}
