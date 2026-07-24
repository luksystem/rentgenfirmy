export function partyLastName(input: { lastName: string }) {
  return input.lastName.trim();
}

export function partyFirstName(input: { firstName: string }) {
  return input.firstName.trim();
}

export function formatPartyName(input: { firstName: string; lastName: string }) {
  const first = partyFirstName(input);
  const last = partyLastName(input);
  return [first, last].filter(Boolean).join(" ") || "—";
}

/** Migawka ServiceClient — imię i nazwisko. */
export function partyToServiceClientName(input: { firstName: string; lastName: string }) {
  return formatPartyName(input);
}

/** Parsuje jedno pole „imię i nazwisko” (np. formularz zgłoszenia) na firstName + lastName. */
export function splitPartyFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    return { firstName: "", lastName: trimmed };
  }

  const firstName = trimmed.slice(0, spaceIdx).trim();
  const lastName = trimmed.slice(spaceIdx + 1).trim();
  return { firstName, lastName: lastName || trimmed };
}
