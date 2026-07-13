import type { MentionCandidate } from "@/lib/notifications/types";

const MENTION_PATTERN =
  /@([A-Za-zÀ-žĄąĆćĘęŁłŃńÓóŚśŹźŻż][\wÀ-žĄąĆćĘęŁłŃńÓóŚśŹźŻż.-]*(?:\s+[A-Za-zÀ-žĄąĆćĘęŁłŃńÓóŚśŹźŻż][\wÀ-žĄąĆćĘęŁłŃńÓóŚśŹźŻż.-]*)?)/g;

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

export function parseMentionNames(text: string) {
  const names = new Set<string>();
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const name = match[1]?.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

export function resolveMentionTargets(text: string, candidates: MentionCandidate[]) {
  const mentionNames = parseMentionNames(text).map(normalizeName);
  if (!mentionNames.length) {
    return [];
  }

  const seen = new Set<string>();
  const targets: MentionCandidate[] = [];

  for (const candidate of candidates) {
    const key = normalizeName(candidate.name);
    if (!mentionNames.includes(key) || seen.has(key)) {
      continue;
    }
    if (candidate.kind === "role" || candidate.roleItemId) {
      seen.add(key);
      targets.push(candidate);
      continue;
    }
    if (!candidate.profileId) {
      continue;
    }
    seen.add(key);
    targets.push(candidate);
  }

  return targets;
}

export function filterMentionOptions(query: string, options: string[]) {
  const normalized = normalizeName(query.replace(/^@/, ""));
  if (!normalized) {
    return options;
  }
  return options.filter((option) => normalizeName(option).includes(normalized));
}
