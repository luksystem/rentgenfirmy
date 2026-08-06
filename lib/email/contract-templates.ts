import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import type { EmailBrandSettings } from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(value);
}

/** Mail z linkiem do podpisania umowy — wzorem `buildOfferSendEmail` (Szybkie oferty). */
export function buildContractSendEmail(input: {
  clientName: string;
  contractTitle: string;
  contractUrl: string;
  expiresAtLabel: string | null;
  netTotal: number | null;
  brand: EmailBrandSettings;
  company?: CompanyProfileDocument | null;
  /** Osobista notatka nadawcy wpisana przed wysyłką — pokazana w mailu jako wyróżniony akapit. */
  senderNote?: string | null;
}) {
  const name = input.clientName.trim() || "Państwo";
  const title = input.contractTitle.trim() || "umowa";

  const subject = `Umowa do podpisania: ${title}`;

  const amountHtml =
    input.netTotal != null
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
          Wartość umowy netto: <strong>${escapeEmailHtml(money(input.netTotal))}</strong> (VAT dolicza się
          po wyborze rozliczenia w umowie)
        </p>`
      : "";

  const senderNote = input.senderNote?.trim();
  const senderNoteHtml = senderNote
    ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:6px;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">
        ${escapeEmailHtml(senderNote)}
      </p>`
    : "";

  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Dzień dobry ${escapeEmailHtml(name)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Przesyłamy umowę <strong>${escapeEmailHtml(title)}</strong> do przejrzenia i podpisania.
    </p>
    ${senderNoteHtml}
    ${amountHtml}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#111827;">
      Pod poniższym linkiem można zapoznać się z treścią umowy, wybrać opcje dodatkowe (jeśli
      dotyczy) i złożyć podpis elektroniczny${
        input.expiresAtLabel ? ` — prosimy o decyzję do ${escapeEmailHtml(input.expiresAtLabel)}` : ""
      }:
    </p>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(input.contractUrl)}"
         style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
        Otwórz umowę
      </a>
    </p>
    <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#6b7280;word-break:break-all;">
      ${escapeEmailHtml(input.contractUrl)}
    </p>
  `;

  return {
    subject,
    html: buildEmailShell({
      content,
      eyebrow: "Umowa",
      disclaimer: input.expiresAtLabel
        ? `Link jest ważny do ${input.expiresAtLabel} — po tym terminie warunki trzeba będzie ustalić na nowo.`
        : undefined,
      brand: input.brand,
      company: input.company,
    }),
  };
}
