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

export function namesMatch(expected: string, provided: string) {
  const expectedNorm = normalizePersonName(expected);
  const providedNorm = normalizePersonName(provided);

  if (!expectedNorm || !providedNorm) {
    return false;
  }

  if (expectedNorm === providedNorm) {
    return true;
  }

  const expectedTokens = nameTokens(expected);
  const providedTokens = nameTokens(provided);

  if (expectedTokens.length === 0 || providedTokens.length === 0) {
    return false;
  }

  const providedSet = new Set(providedTokens);
  const matched = expectedTokens.filter((token) => providedSet.has(token));

  return matched.length >= Math.min(2, expectedTokens.length);
}
