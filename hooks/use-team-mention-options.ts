"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserProfile } from "@/lib/auth/types";
import {
  buildKanbanMentionCandidates,
  buildKanbanMentionOptionNames,
} from "@/lib/kanban/mention-candidates";
import type { MentionCandidate } from "@/lib/notifications/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";

export function useMentionOptionsFromProfiles(
  teamProfiles: UserProfile[],
  roleOptions: DictionaryItem[] = [],
) {
  return useMemo(() => {
    const candidates = buildKanbanMentionCandidates(teamProfiles, [], roleOptions);
    return {
      candidates,
      mentionOptions: buildKanbanMentionOptionNames(candidates),
    };
  }, [roleOptions, teamProfiles]);
}

/** Ładuje listę zespołu do oznaczania @, gdy lokalny store jej nie ma. */
export function useTeamMentionOptions(enabled = true) {
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void fetchTeamProfiles()
      .then((profiles) => {
        if (!cancelled) {
          setTeamProfiles(profiles);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeamProfiles([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const { candidates, mentionOptions } = useMentionOptionsFromProfiles(teamProfiles);

  return {
    teamProfiles,
    candidates,
    mentionOptions,
  } satisfies {
    teamProfiles: UserProfile[];
    candidates: MentionCandidate[];
    mentionOptions: string[];
  };
}
