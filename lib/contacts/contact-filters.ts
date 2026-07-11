import { buildClientAddressLine } from "@/lib/dashboard/google-maps";
import { isContactConverted, type Contact } from "@/lib/contacts/types";

export type ContactListFilters = {
  nameQuery: string;
  addressQuery: string;
  status: "active" | "converted" | "all";
};

export const EMPTY_CONTACT_LIST_FILTERS: ContactListFilters = {
  nameQuery: "",
  addressQuery: "",
  status: "active",
};

export function countActiveContactListFilters(filters: ContactListFilters) {
  let count = 0;
  if (filters.nameQuery.trim()) count += 1;
  if (filters.addressQuery.trim()) count += 1;
  if (filters.status !== "active") count += 1;
  return count;
}

export function filterContacts(contacts: Contact[], filters: ContactListFilters) {
  const nameQuery = filters.nameQuery.trim().toLowerCase();
  const addressQuery = filters.addressQuery.trim().toLowerCase();

  return contacts.filter((contact) => {
    if (filters.status === "active" && isContactConverted(contact)) {
      return false;
    }
    if (filters.status === "converted" && !isContactConverted(contact)) {
      return false;
    }

    if (nameQuery) {
      const nameHaystack = [contact.firstName, contact.lastName, contact.externalId, contact.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!nameHaystack.includes(nameQuery)) {
        return false;
      }
    }

    if (addressQuery) {
      const addressHaystack = [
        contact.addressStreet,
        contact.addressCity,
        contact.addressPostalCode,
        contact.location,
        buildClientAddressLine(contact),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!addressHaystack.includes(addressQuery)) {
        return false;
      }
    }

    return true;
  });
}
