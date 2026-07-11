import { partyToServiceClientName } from "@/lib/party/display-name";
import type { ClientInput, ServiceClient } from "@/lib/service/types";

export const CONTACT_CONVERSION_SOURCES = ["manual", "offer_accepted"] as const;
export type ContactConversionSource = (typeof CONTACT_CONVERSION_SOURCES)[number];

export const CONTACT_HISTORY_TYPES = [
  "created",
  "updated",
  "offer_linked",
  "converted_manual",
  "converted_offer_accepted",
] as const;

export type ContactHistoryType = (typeof CONTACT_HISTORY_TYPES)[number];

export type ContactHistoryEntry = {
  id: string;
  at: string;
  type: ContactHistoryType;
  message: string;
  clientId?: string | null;
  serviceId?: string | null;
};

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  location: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  email: string;
  phone: string;
  notes?: string;
  externalId?: string | null;
  convertedClientId: string | null;
  convertedAt: string | null;
  conversionSource: ContactConversionSource | null;
  handledAt: string | null;
  history: ContactHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type ContactInput = Omit<
  Contact,
  | "id"
  | "convertedClientId"
  | "convertedAt"
  | "conversionSource"
  | "handledAt"
  | "history"
  | "createdAt"
  | "updatedAt"
>;

export function contactToServiceClient(
  contact: Pick<Contact, "firstName" | "lastName" | "location" | "email" | "phone">,
): ServiceClient {
  return {
    fullName: partyToServiceClientName(contact),
    location: contact.location,
    email: contact.email,
    phone: contact.phone,
  };
}

export function contactToClientInput(contact: Contact): ClientInput {
  const notesParts = [
    contact.notes?.trim(),
    `Powstało z kontaktu (${contact.id}).`,
  ].filter(Boolean);

  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    location: contact.location,
    addressStreet: contact.addressStreet,
    addressCity: contact.addressCity,
    addressPostalCode: contact.addressPostalCode,
    email: contact.email,
    phone: contact.phone,
    notes: notesParts.join("\n\n"),
    externalId: contact.externalId ?? null,
  };
}

export function isContactConverted(contact: Contact) {
  return Boolean(contact.convertedClientId);
}

export function isContactUnhandled(contact: Contact) {
  return !isContactConverted(contact) && !contact.handledAt;
}

export function countUnhandledContacts(contacts: Contact[]) {
  return contacts.filter(isContactUnhandled).length;
}

export function activeContacts(contacts: Contact[]) {
  return contacts.filter((contact) => !isContactConverted(contact));
}
