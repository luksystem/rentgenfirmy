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
  const isSettlement = input.kind === "settlement";

  const subject = isSettlement
    ? `Termin akceptacji rozliczenia: ${expiresLabel}: ${title}`
    : `Oferta wygasa ${expiresLabel}: ${title}`;

  const bodyIntro = isSettlement
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
        Przypominamy o rozliczeniu
        <strong>${escapeEmailHtml(title)}</strong>.
        Jeśli nie zareagujesz do
        <strong>${escapeEmailHtml(expiresLabel)}</strong>,
        rozliczenie zostanie uznane za zaakceptowane, a wyliczona kwota zostanie zafakturowana.
      </p>`
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
        Przypominamy, że oferta
        <strong>${escapeEmailHtml(title)}</strong>
        straci ważność
        <strong>${escapeEmailHtml(expiresLabel)}</strong>.
        Po tym terminie trzeba będzie renegocjować jej warunki.
      </p>`;

  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
      Dzień dobry ${escapeEmailHtml(name)},
    </p>
    ${bodyIntro}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#111827;">
      Możesz zaakceptować, odrzucić albo poprosić o konsultację pod poniższym linkiem:
    </p>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(input.offerUrl)}"
         style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
        Otwórz i zdecyduj
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
      eyebrow: isSettlement ? "Rozliczenie" : "Oferta",
      disclaimer: isSettlement
        ? "Link do rozliczenia nie wygasa — ale brak reakcji do podanego terminu oznacza automatyczną akceptację i fakturowanie."
        : "Po upływie terminu ważności link przestanie działać — warunki będzie trzeba ustalić na nowo.",
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

  if (input.kind === "settlement") {
    return `Rozliczenie "${title}": brak reakcji do ${expiresLabel} = automatyczna akceptacja i faktura. Decyzja: ${input.offerUrl}`;
  }

  return `Oferta "${title}" wygasa ${expiresLabel}. Potem trzeba renegocjowac warunki. Akceptacja: ${input.offerUrl}`;
}

export function buildOfferExpiryReminderPush(input: {
  offerTitle: string;
  expiresAt: string;
  kind: "estimate" | "settlement";
}) {
  const title = input.offerTitle.trim() || (input.kind === "settlement" ? "rozliczenie" : "oferta");
  const expiresLabel = formatDate(input.expiresAt);

  if (input.kind === "settlement") {
    return {
      title: `Termin akceptacji rozliczenia: ${title}`,
      body: `Brak reakcji klienta do ${expiresLabel} = automatyczna akceptacja i fakturowanie.`,
    };
  }

  return {
    title: `Oferta wygasa: ${title}`,
    body: `Ważność do ${expiresLabel}. Po terminie trzeba renegocjować warunki. Otwórz link, aby zaakceptować.`,
  };
}
