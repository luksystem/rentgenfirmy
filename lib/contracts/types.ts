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

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Szkic",
  sent: "Wysłana do klienta",
  negotiating: "Negocjacje",
  signed_client: "Podpisana przez klienta — czeka na firmę",
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

export type ContractTableSection = {
  id: string;
  type: "table";
  title: string;
  description: string;
  showProductDescriptions: boolean;
  group: ContractTableGroup;
  /** Tylko dla group === "option": czy klient zaznaczył tę opcję przy podpisywaniu. */
  selected: boolean;
  rows: ServiceFixedPriceRow[];
};

export type ContractSection = ContractTextSection | ContractTableSection;

export function isContractTableSection(section: ContractSection): section is ContractTableSection {
  return section.type === "table";
}

export function isContractTextSection(section: ContractSection): section is ContractTextSection {
  return section.type === "text";
}

export type ContractPaymentScheduleItem = {
  id: string;
  label: string;
  /** Procent aktualnej sumy umowy (główna + zaznaczone opcje), 0–100. */
  percent: number;
  note: string;
};

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
  paymentSchedule: ContractPaymentScheduleItem[];
  publicToken: string | null;
  tokenExpiresAt: string | null;
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
  paymentSchedule: ContractPaymentScheduleItem[];
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

export function canRespondToContract(contract: Contract) {
  return contract.status === "sent" || contract.status === "negotiating";
}

export function canCompanySignContract(contract: Contract) {
  return contract.status === "signed_client";
}
