import { calculateContractTotals } from "@/lib/contracts/totals";
import type { Contract } from "@/lib/contracts/types";
import { formatDate, formatMoney } from "@/lib/utils";

/** Wzorem `lib/service/client-offer-delivery.ts` — ręczna wysyłka linku (bez maila z serwera). */
export function buildContractEmailContent(contract: Contract, contractUrl: string) {
  const clientName = contract.client.fullName.trim() || "Państwo";
  const total = calculateContractTotals(contract.sections).totalNet;

  const subject = `Umowa do podpisania: ${contract.title}`;

  const body = [
    `Dzień dobry ${clientName},`,
    "",
    "Przesyłamy umowę do przejrzenia i podpisania.",
    "",
    `Umowa: ${contract.title}`,
    `Wartość netto: ${formatMoney(total)}`,
    "",
    "Link do umowy:",
    contractUrl,
    "",
    "Pod linkiem można zapoznać się z treścią, wybrać opcje dodatkowe i złożyć podpis.",
    "",
    "Pozdrawiamy,",
    "Rentgen firmy",
  ].join("\n");

  return { subject, body };
}

export function buildContractMailtoUrl(contract: Contract, contractUrl: string) {
  const email = contract.client.email.trim();
  if (!email) {
    return null;
  }

  const { subject, body } = buildContractEmailContent(contract, contractUrl);
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function canShareContract() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareContract(contract: Contract, contractUrl: string) {
  if (!canShareContract()) {
    throw new Error("Udostępnianie nie jest dostępne w tej przeglądarce.");
  }

  const { subject, body } = buildContractEmailContent(contract, contractUrl);
  await navigator.share({ title: subject, text: body, url: contractUrl });
}

export function formatContractLinkExpiryHint(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }
  return `Link ważny do ${formatDate(expiresAt)}.`;
}
