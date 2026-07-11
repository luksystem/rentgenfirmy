import { formatPartyName } from "@/lib/party/display-name";

export type IntakePartyRecord = {
  firstName: string;
  lastName: string;
  location?: string;
};

function normalizePersonName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(value: string) {
  return normalizePersonName(value).split(" ").filter(Boolean);
}

function tokensOverlap(expectedTokens: string[], providedTokens: string[]) {
  for (const providedToken of providedTokens) {
    if (providedToken.length < 2) {
      continue;
    }
    for (const expectedToken of expectedTokens) {
      if (
        expectedToken === providedToken ||
        expectedToken.includes(providedToken) ||
        providedToken.includes(expectedToken)
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Wystarczy częściowe dopasowanie imienia, nazwiska lub fragmentu. */
export function namesMatch(expected: string, provided: string) {
  const expectedNorm = normalizePersonName(expected);
  const providedNorm = normalizePersonName(provided);

  if (!expectedNorm || !providedNorm) {
    return false;
  }

  if (expectedNorm === providedNorm) {
    return true;
  }

  if (providedNorm.length >= 2 && expectedNorm.includes(providedNorm)) {
    return true;
  }

  if (expectedNorm.length >= 2 && providedNorm.includes(expectedNorm)) {
    return true;
  }

  const expectedTokens = nameTokens(expected);
  const providedTokens = nameTokens(provided);

  if (expectedTokens.length === 0 || providedTokens.length === 0) {
    return false;
  }

  return tokensOverlap(expectedTokens, providedTokens);
}

function fieldMatchesClientPart(expected: string, provided: string) {
  const trimmed = provided.trim();
  if (!trimmed || !expected.trim()) {
    return false;
  }

  return namesMatch(expected, trimmed);
}

function clientSearchableParts(record: IntakePartyRecord) {
  const parts = new Set<string>();
  const first = record.firstName.trim();
  const last = record.lastName.trim();
  const location = record.location?.trim() ?? "";
  const full = formatPartyName({ firstName: first, lastName: last });

  for (const value of [first, last, full, location, `${first} ${last}`.trim(), `${last} ${first}`.trim()]) {
    if (value) {
      parts.add(value);
    }
  }

  for (const token of nameTokens(`${first} ${last} ${location}`.trim())) {
    parts.add(token);
  }

  return [...parts];
}

function providedNameValues(party: { firstName: string; lastName: string }) {
  const first = party.firstName.trim();
  const last = party.lastName.trim();
  const combined = [first, last].filter(Boolean).join(" ").trim();

  return [first, last, combined].filter(Boolean);
}

/** Wystarczy częściowe dopasowanie imienia lub nazwiska — nie trzeba podawać obu pól. */
export function intakePartyMatchesClient(
  client: IntakePartyRecord,
  party: { firstName: string; lastName: string },
) {
  const providedValues = providedNameValues(party);
  if (providedValues.length === 0) {
    return false;
  }

  const searchable = clientSearchableParts(client);
  if (searchable.length === 0) {
    return false;
  }

  for (const provided of providedValues) {
    for (const expected of searchable) {
      if (fieldMatchesClientPart(expected, provided)) {
        return true;
      }
    }
  }

  return false;
}
