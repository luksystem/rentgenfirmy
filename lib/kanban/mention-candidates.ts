import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import type { MentionCandidate } from "@/lib/notifications/types";

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

export function buildKanbanMentionCandidates(
  teamProfiles: UserProfile[],
  extraNames: string[] = [],
): MentionCandidate[] {
  const candidates: MentionCandidate[] = teamProfiles.map((profile) => ({
    profileId: profile.id,
    name: getUserDisplayName(profile),
  }));

  const seen = new Set(candidates.map((entry) => normalizeName(entry.name)));

  for (const name of extraNames) {
    const trimmed = name.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeName(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push({ profileId: null, name: trimmed });
  }

  return candidates.sort((left, right) => left.name.localeCompare(right.name, "pl"));
}

export function buildKanbanMentionOptionNames(candidates: MentionCandidate[]) {
  return candidates.map((entry) => entry.name);
}
