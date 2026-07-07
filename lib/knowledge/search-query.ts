// Prosty ekstraktor słów kluczowych z opisu zgłoszenia, do przeszukania pełnotekstowego
// (Postgres `to_tsquery`). Bez stemmingu — pomija tylko najczęstsze polskie słowa funkcyjne.

const POLISH_STOPWORDS = new Set([
  "aby",
  "ale",
  "bardzo",
  "bez",
  "być",
  "całkowicie",
  "czy",
  "czyli",
  "dla",
  "do",
  "gdy",
  "gdzie",
  "i",
  "ich",
  "iż",
  "jak",
  "jakie",
  "jest",
  "jeśli",
  "już",
  "kiedy",
  "ktora",
  "która",
  "które",
  "który",
  "lub",
  "ma",
  "mam",
  "może",
  "można",
  "moje",
  "na",
  "nam",
  "nas",
  "nie",
  "niż",
  "od",
  "oraz",
  "po",
  "pod",
  "przez",
  "przy",
  "są",
  "się",
  "tak",
  "tam",
  "te",
  "tej",
  "ten",
  "to",
  "tu",
  "tylko",
  "tym",
  "w",
  "we",
  "wtedy",
  "z",
  "za",
  "ze",
  "że",
]);

function stripDiacriticsSafeChars(word: string) {
  return word.replace(/[^\p{L}\p{N}]/gu, "");
}

/** Wyciąga do `maxTerms` znaczących słów z tekstu, do budowy zapytania OR w `to_tsquery`. */
export function extractKeywords(text: string, maxTerms = 12): string[] {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map(stripDiacriticsSafeChars)
    .filter((word) => word.length >= 3 && !POLISH_STOPWORDS.has(word));

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const word of words) {
    if (seen.has(word)) {
      continue;
    }
    seen.add(word);
    keywords.push(word);
    if (keywords.length >= maxTerms) {
      break;
    }
  }
  return keywords;
}

/**
 * Buduje wyrażenie dla `to_tsquery('simple', ...)` łączące słowa kluczowe operatorem OR (`|`),
 * tak by dopasować wycinki treści zawierające CHOCIAŻ JEDNO ze słów opisu zgłoszenia.
 * Zwraca `null`, jeśli w tekście nie znaleziono żadnych sensownych słów.
 */
export function buildOrTsQuery(text: string, maxTerms = 12): string | null {
  const keywords = extractKeywords(text, maxTerms);
  if (keywords.length === 0) {
    return null;
  }
  return keywords.map((word) => `${word}:*`).join(" | ");
}
