import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import type { MentionCandidate } from "@/lib/notifications/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

export function buildKanbanMentionCandidates(
  teamProfiles: UserProfile[],
  extraNames: string[] = [],
  roleOptions: DictionaryItem[] = [],
): MentionCandidate[] {
  const candidates: MentionCandidate[] = teamProfiles.map((profile) => ({
    profileId: profile.id,
    name: getUserDisplayName(profile),
    kind: "user" as const,
  }));

  const seen = new Set(candidates.map((entry) => normalizeName(entry.name)));

  for (const role of roleOptions) {
    const key = normalizeName(role.name);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push({
      profileId: null,
      name: role.name,
      kind: "role",
      roleItemId: role.id,
    });
  }

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
    candidates.push({ profileId: null, name: trimmed, kind: "user" });
  }

  return candidates.sort((left, right) => left.name.localeCompare(right.name, "pl"));
}

export function buildKanbanMentionOptionNames(candidates: MentionCandidate[]) {
  return candidates.map((entry) => entry.name);
}
