import { formatPartyName } from "@/lib/party/display-name";

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
  if (!trimmed) {
    return false;
  }

  return namesMatch(expected, trimmed);
}

/** Wystarczy częściowe dopasowanie imienia lub nazwiska — nie trzeba podawać obu pól. */
export function intakePartyMatchesClient(
  client: { firstName: string; lastName: string },
  party: { firstName: string; lastName: string },
) {
  const providedFirst = party.firstName.trim();
  const providedLast = party.lastName.trim();

  if (!providedFirst && !providedLast) {
    return false;
  }

  const clientFirst = client.firstName.trim();
  const clientLast = client.lastName.trim();
  const clientFull = formatPartyName(client);

  const checks: boolean[] = [];

  if (providedFirst) {
    checks.push(
      fieldMatchesClientPart(clientFirst, providedFirst) ||
        fieldMatchesClientPart(clientLast, providedFirst) ||
        fieldMatchesClientPart(clientFull, providedFirst),
    );
  }

  if (providedLast) {
    checks.push(
      fieldMatchesClientPart(clientLast, providedLast) ||
        fieldMatchesClientPart(clientFirst, providedLast) ||
        fieldMatchesClientPart(clientFull, providedLast),
    );
  }

  return checks.some(Boolean);
}
