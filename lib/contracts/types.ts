import { partyToServiceClientName } from "@/lib/party/display-name";
import type { Client, ServiceFixedPriceRow } from "@/lib/service/types";
import type { Contact } from "@/lib/contacts/types";

/**
 * Moduł Umowy — dokument handlowy wzorem `services` (Szybkie oferty): jeden rekord z szerokimi
 * polami jsonb (`sections`, `paymentSchedule`), bez znormalizowanych tabel podrzędnych. Wiersze
 * tabel pozycji reużywają `ServiceFixedPriceRow` (lib/service/types.ts) 1:1 — ten sam kształt,
 * ten sam edytor (`ServiceFixedPriceTableRow`), żeby nie duplikować mechanizmu wyceny pozycji.
 */

export const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "negotiating",
  "signed_client",
  "signed_both",
  "rejected",
  "expired",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/**
 * Uproszczone etykiety statusu (Szkic/Wysłana/Podpisana) — nuanse (negocjacje, czeka na podpis
 * firmy) są widoczne osobno w panelu wysyłki/podpisu, więc odznaka statusu może zostać prosta.
 */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Szkic",
  sent: "Wysłana",
  negotiating: "Wysłana",
  signed_client: "Podpisana",
  signed_both: "Podpisana",
  rejected: "Odrzucona",
  expired: "Wygasła",
};

export type ContractClient = {
  fullName: string;
  location: string;
  email: string;
  phone: string;
  nip: string;
  companyName: string;
};

export function emptyContractClient(): ContractClient {
  return { fullName: "", location: "", email: "", phone: "", nip: "", companyName: "" };
}

export function clientToContractClient(
  client: Pick<Client, "firstName" | "lastName" | "location" | "email" | "phone">,
): ContractClient {
  return {
    fullName: partyToServiceClientName(client),
    location: client.location,
    email: client.email,
    phone: client.phone,
    nip: "",
    companyName: "",
  };
}

export function contactToContractClient(
  contact: Pick<Contact, "firstName" | "lastName" | "location" | "email" | "phone">,
): ContractClient {
  return {
    fullName: partyToServiceClientName(contact),
    location: contact.location,
    email: contact.email,
    phone: contact.phone,
    nip: "",
    companyName: "",
  };
}

export type ContractTextSection = {
  id: string;
  type: "text";
  title: string;
  content: string;
  /** Wykreślona — zostaje w dokumencie (przekreślona), zamiast znikać bez śladu. */
  struck: boolean;
  /** Id bloku z biblioteki, z którego wstawiono treść — tylko informacyjnie, treść jest kopią. */
  blockId: string | null;
};

export const CONTRACT_TABLE_GROUPS = ["main", "option"] as const;
export type ContractTableGroup = (typeof CONTRACT_TABLE_GROUPS)[number];

export const CONTRACT_OPTION_CATEGORIES = ["instalacja", "instalacje_dodatkowe", "dodatki"] as const;
export type ContractOptionCategory = (typeof CONTRACT_OPTION_CATEGORIES)[number];

export const CONTRACT_OPTION_CATEGORY_LABELS: Record<ContractOptionCategory, string> = {
  instalacja: "Instalacja (kompleksowa)",
  instalacje_dodatkowe: "Instalacje dodatkowe",
  dodatki: "Dodatki",
};

export type ContractTableSection = {
  id: string;
  type: "table";
  title: string;
  description: string;
  showProductDescriptions: boolean;
  group: ContractTableGroup;
  /** Tylko dla group === "option" — jedna z 3 kategorii, decyduje o sposobie zaznaczania. */
  category: ContractOptionCategory | null;
  /** Rabat % doliczany do tej tabeli, gdy klient ją zaznaczy (kategorie instalacja/instalacje_dodatkowe). */
  categoryDiscountPercent: number;
  /** Zaznaczenie całej tabeli — zawsze true dla group="main"; dla group="option" tylko kategorie
   * instalacja/instalacje_dodatkowe (kategoria "dodatki" zaznacza się per pozycja, patrz `selectedRowIds`). */
  selected: boolean;
  /** Tylko dla category === "dodatki": id zaznaczonych przez klienta pozycji tej tabeli. */
  selectedRowIds: string[];
  rows: ServiceFixedPriceRow[];
};

export type ContractSection = ContractTextSection | ContractTableSection;

export function isContractTableSection(section: ContractSection): section is ContractTableSection {
  return section.type === "table";
}

export function isContractTextSection(section: ContractSection): section is ContractTextSection {
  return section.type === "text";
}

export type ContractPaymentPlanInstallment = {
  id: string;
  label: string;
  /** Procent sumy umowy po ewentualnym rabacie za wariant (0–100). */
  percent: number;
  note: string;
  /** Gdy > 1, ta rata dzieli się na N równych części w kolejnych miesiącach. */
  splitOverMonths: number;
};

/**
 * Wariant płatności — konfigurowalny tylko przez biuro (w umowie/szablonie), klient wybiera
 * jeden z nich przy podpisywaniu. Wybór szybszej płatności może dawać dodatkowy rabat od całej
 * sumy umowy (`discountPercent`), widoczny klientowi na żywo przed podpisem.
 */
export type ContractPaymentPlan = {
  id: string;
  label: string;
  discountPercent: number;
  installments: ContractPaymentPlanInstallment[];
};

export const CONTRACT_PAYER_TYPES = ["firma", "osoba_prywatna"] as const;
export type ContractPayerType = (typeof CONTRACT_PAYER_TYPES)[number];

export const CONTRACT_PAYER_TYPE_LABELS: Record<ContractPayerType, string> = {
  firma: "Firma (23% VAT)",
  osoba_prywatna: "Osoba prywatna",
};

export const CONTRACT_BUILDING_TYPES = ["dom_jednorodzinny", "lokal_mieszkalny"] as const;
export type ContractBuildingType = (typeof CONTRACT_BUILDING_TYPES)[number];

export const CONTRACT_BUILDING_TYPE_LABELS: Record<ContractBuildingType, string> = {
  dom_jednorodzinny: "Budynek mieszkalny jednorodzinny (próg 300 m²)",
  lokal_mieszkalny: "Lokal mieszkalny (próg 150 m²)",
};

/**
 * Deklaracja rozliczenia VAT — wybierana przez klienta na stronie podpisu (patrz plan modułu
 * Umowa). `payerType` ustala stawkę dla części rozliczanej "normalnie"; `innePercent` wydziela
 * dodatkowo część kwoty rozliczaną jako "inne" (gotówka, 0% VAT + rabat z ustawień modułu).
 */
export type ContractVatDeclaration = {
  payerType: ContractPayerType;
  buildingType: ContractBuildingType | null;
  areaM2: number | null;
  /** 0–100, jaki % sumy netto rozliczany jest jako "inne" (gotówka, 0% VAT). */
  innePercent: number;
};

export function emptyContractVatDeclaration(): ContractVatDeclaration {
  return { payerType: "osoba_prywatna", buildingType: null, areaM2: null, innePercent: 0 };
}

export type ContractClientSignature = {
  signerName: string;
  signedAt: string;
  ip: string | null;
};

export type ContractCompanySignature = {
  signerName: string;
  signedAt: string;
  userId: string | null;
};

export const CONTRACT_HISTORY_TYPES = [
  "created",
  "created_from_template",
  "link_generated",
  "link_regenerated",
  "sent",
  "option_selection_updated",
  "signed_client",
  "signed_company",
  "rejected",
  "negotiation_message",
] as const;

export type ContractHistoryType = (typeof CONTRACT_HISTORY_TYPES)[number];

export type ContractHistoryEntry = {
  id: string;
  at: string;
  type: ContractHistoryType;
  message: string;
};

export type Contract = {
  id: string;
  status: ContractStatus;
  templateId: string | null;
  clientId: string | null;
  contactId: string | null;
  title: string;
  client: ContractClient;
  sections: ContractSection[];
  paymentPlans: ContractPaymentPlan[];
  /** Wariant wybrany przez klienta przy podpisie — id z `paymentPlans` albo null (nie wybrano/brak wariantów). */
  selectedPaymentPlanId: string | null;
  /** Deklaracja rozliczenia VAT wybrana przez klienta przy podpisie. */
  vatDeclaration: ContractVatDeclaration;
  publicToken: string | null;
  tokenExpiresAt: string | null;
  tokenSentAt: string | null;
  companySignature: ContractCompanySignature | null;
  clientSignature: ContractClientSignature | null;
  history: ContractHistoryEntry[];
  signedDocumentStoragePath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sections: ContractSection[];
  paymentPlans: ContractPaymentPlan[];
  createdAt: string;
  updatedAt: string;
};

export type ContractTemplateInput = Omit<ContractTemplate, "id" | "createdAt" | "updatedAt">;

export type ContractContentBlock = {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractContentBlockInput = Omit<ContractContentBlock, "id" | "createdAt" | "updatedAt">;

/**
 * Czy klient może (jeszcze) zareagować na umowę pod linkiem publicznym — oparte o obecność
 * ważnego tokenu, nie o status "sent": status przełącza się na "Wysłana" dopiero po faktycznej
 * wysyłce mailem (patrz `sendContractEmailServer`), ale link można też przekazać ręcznie (kopiuj/
 * mailto/udostępnij) zanim to nastąpi — klient musi wtedy nadal móc podpisać.
 */
export function canRespondToContract(contract: Contract) {
  return (
    Boolean(contract.publicToken) &&
    contract.status !== "signed_client" &&
    contract.status !== "signed_both" &&
    contract.status !== "rejected"
  );
}

export function canCompanySignContract(contract: Contract) {
  return contract.status === "signed_client";
}

/** Czy da się (jeszcze) wysłać/wygenerować link do podpisania tej umowy. */
export function canSendContract(contract: Contract) {
  return (
    contract.status !== "signed_client" &&
    contract.status !== "signed_both" &&
    contract.status !== "rejected"
  );
}
