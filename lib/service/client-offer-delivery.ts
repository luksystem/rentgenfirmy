import type { ServiceRecord } from "@/lib/service/types";
import { formatDate } from "@/lib/utils";
import { getClientOfferUrl } from "@/lib/service/client-offer";

export function buildClientOfferEmailContent(service: ServiceRecord, offerUrl: string) {
  const clientName = service.client.fullName.trim() || "Państwo";
  const location = service.client.location.trim();

  const subject = `Wycena serwisu: ${service.title}`;

  const body = [
    `Dzień dobry ${clientName},`,
    "",
    "Przesyłamy wycenę serwisu do Państwa akceptacji.",
    "",
    `Zgłoszenie: ${service.title}`,
    location ? `Obiekt: ${location}` : null,
    "",
    "Link do oferty (ważny 30 dni):",
    offerUrl,
    "",
    "W linku można:",
    "• zaakceptować ofertę,",
    "• odrzucić ofertę,",
    "• wysłać wiadomość z prośbą o negocjację.",
    "",
    "Pozdrawiamy,",
    "Rentgen firmy",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { subject, body };
}

export function buildClientOfferMailtoUrl(service: ServiceRecord, offerUrl: string) {
  const email = service.client.email.trim();
  if (!email) {
    return null;
  }

  const { subject, body } = buildClientOfferEmailContent(service, offerUrl);

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function canShareClientOffer() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareClientOffer(service: ServiceRecord, offerUrl: string) {
  if (!canShareClientOffer()) {
    throw new Error("Udostępnianie nie jest dostępne w tej przeglądarce.");
  }

  const { subject, body } = buildClientOfferEmailContent(service, offerUrl);

  await navigator.share({
    title: subject,
    text: body,
    url: offerUrl,
  });
}

export function getRegenerateOfferLabel(service: ServiceRecord) {
  if (service.clientOffer.status === "negotiation") {
    return "Wyślij zaktualizowaną ofertę (nowy link)";
  }

  if (service.clientOffer.token) {
    return "Wygeneruj nowy link";
  }

  return "Generuj link dla klienta";
}

export function shouldConfirmOfferRegeneration(service: ServiceRecord) {
  return Boolean(service.clientOffer.token && service.clientOffer.status === "pending");
}

export function getOfferRegenerationHint(service: ServiceRecord) {
  if (service.clientOffer.status === "negotiation") {
    return "Klient prosił o negocjację. Po poprawieniu wyceny wygeneruj nowy link — poprzedni przestanie działać.";
  }

  if (shouldConfirmOfferRegeneration(service)) {
    return "Nowy link unieważni poprzedni. Wyślij klientowi tylko najnowszy adres.";
  }

  return "Wyślij link e-mailem, przez udostępnianie (telefon) lub skopiuj ręcznie do SMS / WhatsApp.";
}

export function formatOfferSentHint(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }

  return `Link ważny do ${formatDate(expiresAt)}.`;
}

export function getClientOfferUrlForService(service: ServiceRecord, origin?: string) {
  if (!service.clientOffer.token) {
    return null;
  }

  return getClientOfferUrl(service.clientOffer.token, origin);
}
