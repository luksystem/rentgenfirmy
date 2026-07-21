import { buildClientAddressLine } from "@/lib/dashboard/google-maps";
import { splitPartyFullName } from "@/lib/party/display-name";
import type { Client } from "@/lib/service/types";

export type GuestContactAddress = {
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
};

export function normalizeGuestPostalCode(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 5) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return trimmed;
}

export function isValidGuestPostalCode(input: string): boolean {
  return /^\d{2}-\d{3}$/.test(normalizeGuestPostalCode(input));
}

export function normalizeGuestContactAddress(raw: GuestContactAddress): GuestContactAddress {
  return {
    addressStreet: raw.addressStreet.trim(),
    addressCity: raw.addressCity.trim(),
    addressPostalCode: normalizeGuestPostalCode(raw.addressPostalCode),
  };
}

export function validateGuestContactAddress(raw: GuestContactAddress): string | null {
  const address = normalizeGuestContactAddress(raw);

  if (address.addressStreet.length < 3) {
    return "Podaj ulicę i numer obiektu (min. 3 znaki).";
  }
  if (address.addressCity.length < 2) {
    return "Podaj miasto.";
  }
  if (!isValidGuestPostalCode(address.addressPostalCode)) {
    return "Podaj poprawny kod pocztowy (format: 00-001).";
  }

  return null;
}

export function isGuestContactAddressComplete(raw: GuestContactAddress): boolean {
  return validateGuestContactAddress(raw) === null;
}

export function formatGuestContactAddress(raw: GuestContactAddress): string {
  const address = normalizeGuestContactAddress(raw);
  return buildClientAddressLine({
    location: "",
    addressStreet: address.addressStreet,
    addressCity: address.addressCity,
    addressPostalCode: address.addressPostalCode,
  });
}

export function buildGuestServiceClient(input: {
  fullName: string;
  email: string;
  phone: string;
  address: GuestContactAddress;
}): Client {
  const address = normalizeGuestContactAddress(input.address);
  const location = formatGuestContactAddress(address);
  const { firstName, lastName } = splitPartyFullName(input.fullName);
  const now = new Date().toISOString();

  return {
    id: "guest",
    firstName,
    lastName,
    location,
    addressStreet: address.addressStreet,
    addressCity: address.addressCity,
    addressPostalCode: address.addressPostalCode,
    lat: null,
    lng: null,
    gpsManual: false,
    gpsAddressFingerprint: null,
    email: input.email,
    phone: input.phone,
    notes: "",
    externalId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseGuestContactAddressBody(
  value: unknown,
): GuestContactAddress | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const addressStreet = typeof data.addressStreet === "string" ? data.addressStreet : "";
  const addressCity = typeof data.addressCity === "string" ? data.addressCity : "";
  const addressPostalCode =
    typeof data.addressPostalCode === "string" ? data.addressPostalCode : "";

  if (!addressStreet.trim() && !addressCity.trim() && !addressPostalCode.trim()) {
    return null;
  }

  return { addressStreet, addressCity, addressPostalCode };
}
