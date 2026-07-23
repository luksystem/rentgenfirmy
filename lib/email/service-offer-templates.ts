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

export function buildOfferSendEmail(input: {
  clientName: string;
  offerTitle: string;
  offerUrl: string;
  /** Sformatowana etykieta daty ważności (np. przez formatDate) — lub null, gdy brak terminu. */
  expiresAtLabel: string | null;
  grossTotal: number | null;
  kind: "estimate" | "settlement";
  brand: EmailBrandSettings;
  company?: CompanyProfileDocument | null;
}) {
  const name = input.clientName.trim() || "Państwo";
  const title = input.offerTitle.trim() || (input.kind === "settlement" ? "rozliczenie" : "oferta");
  const kindLabel = input.kind === "settlement" ? "rozliczenie powykonawcze" : "wycenę";
  const actionLabel = input.kind === "settlement" ? "rozliczenie" : "ofertę";

  const subject =
    input.kind === "settlement"
      ? `Rozliczenie powykonawcze: ${title}`
      : `Wycena: ${title}`;

  const amountHtml =
    input.grossTotal != null
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
          Kwota brutto: <strong>${escapeEmailHtml(money(input.grossTotal))}</strong>
        </p>`
      : "";

  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Dzień dobry ${escapeEmailHtml(name)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Przesyłamy ${kindLabel}
      <strong>${escapeEmailHtml(title)}</strong>
      do przejrzenia i decyzji.
    </p>
    ${amountHtml}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#111827;">
      Możesz zaakceptować, odrzucić albo poprosić o konsultację pod poniższym linkiem:
    </p>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(input.offerUrl)}"
         style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
        Otwórz ${actionLabel}
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
      disclaimer: input.expiresAtLabel
        ? `Link jest ważny do ${input.expiresAtLabel} — po tym terminie warunki trzeba będzie ustalić na nowo.`
        : undefined,
      brand: input.brand,
      company: input.company,
    }),
  };
}
