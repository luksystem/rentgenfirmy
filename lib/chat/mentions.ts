const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

function stripDiacritics(value: string) {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < COMBINING_MARK_START || code > COMBINING_MARK_END) {
      result += char;
    }
  }
  return result;
}

function mentionSlug(value: string) {
  return stripDiacritics(value.trim().toLowerCase().normalize("NFD")).replace(/[^a-z0-9]+/g, "");
}

export const MENTION_ALL_TOKEN = "wszyscy";

export type MentionCandidate = {
  profileId: string;
  firstName: string;
  lastName: string;
};

/** Kanoniczny token wzmianki wstawiany przez autocomplete: @imie.nazwisko (bez PL znaków). */
export function buildMentionToken(candidate: Pick<MentionCandidate, "firstName" | "lastName">) {
  const first = mentionSlug(candidate.firstName);
  const last = mentionSlug(candidate.lastName);
  return `@${[first, last].filter(Boolean).join(".")}`;
}

export function buildAllMentionToken() {
  return `@${MENTION_ALL_TOKEN}`;
}

const MENTION_TOKEN_PATTERN = /@([a-z0-9.]+)/gi;

export function extractMentionTokens(body: string): string[] {
  const tokens: string[] = [];
  for (const match of body.matchAll(MENTION_TOKEN_PATTERN)) {
    tokens.push(match[1].toLowerCase());
  }
  return tokens;
}

export function resolveMentions(
  body: string,
  members: MentionCandidate[],
): { profileIds: string[]; isAll: boolean } {
  const tokens = extractMentionTokens(body);
  const isAll = tokens.includes(MENTION_ALL_TOKEN);
  const profileIds = new Set<string>();

  for (const token of tokens) {
    for (const member of members) {
      const canonical = buildMentionToken(member).slice(1).toLowerCase();
      if (canonical && (canonical === token || canonical.startsWith(token))) {
        profileIds.add(member.profileId);
      }
    }
  }

  return { profileIds: [...profileIds], isAll };
}
