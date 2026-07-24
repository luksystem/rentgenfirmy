"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLE_LABELS, getUserDisplayName, hasFullAppAccess } from "@/lib/auth/types";
import { profileHasAllProjectsAccess } from "@/lib/project-access/rules";
import {
  fetchProjectAccessibleProfiles,
  setProjectRoleFlag,
  type ProjectAssignedProfile,
  type ProjectRoleFlags,
} from "@/lib/supabase/project-access-repository";
import { useAuthStore } from "@/store/auth-store";

const ROLE_FIELDS: { field: keyof ProjectRoleFlags; label: string }[] = [
  { field: "technicalLead", label: "Lider techniczny" },
  { field: "operationalLead", label: "Lider operacyjny" },
  { field: "developer", label: "Programista" },
];

export function ProjectUsersPanel({ projectId }: { projectId: string }) {
  const currentProfile = useAuthStore((state) => state.profile);
  const canEditRoles = currentProfile ? hasFullAppAccess(currentProfile.role) : false;
  const [profiles, setProfiles] = useState<ProjectAssignedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchProjectAccessibleProfiles(projectId)
      .then((loaded) => {
        if (!cancelled) {
          setProfiles(loaded);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nie udało się wczytać użytkowników.");
          setProfiles([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function toggleRole(profileId: string, field: keyof ProjectRoleFlags, value: boolean) {
    const key = `${profileId}:${field}`;
    setBusyKey(key);
    try {
      const updated = await setProjectRoleFlag(projectId, profileId, field, value);
      setProfiles(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać roli.");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie użytkowników…</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Osoby z dostępem do tego projektu — administratorzy, użytkownicy z pełnym dostępem oraz
        osoby przypisane w module Użytkownicy.
        {canEditRoles
          ? " Zaznacz lidera technicznego, lidera operacyjnego i programistę — tylko oni dostają powiadomienia o zdarzeniach projektowych (np. akceptacja zmiany przez klienta)."
          : ""}
      </p>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak użytkowników z dostępem do tego projektu.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-surface-muted/20 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Użytkownik</th>
                  <th className="px-4 py-3 font-medium">Rola</th>
                  <th className="px-4 py-3 font-medium">Dostęp</th>
                  {ROLE_FIELDS.map(({ field, label }) => (
                    <th key={field} className="px-4 py-3 font-medium text-center">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {getUserDisplayName(profile)}
                      <p className="text-xs font-normal text-muted">{profile.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{USER_ROLE_LABELS[profile.role]}</td>
                    <td className="px-4 py-3">
                      <Badge tone={profileHasAllProjectsAccess(profile) ? "blue" : "neutral"}>
                        {profileHasAllProjectsAccess(profile)
                          ? "Wszystkie projekty"
                          : "Przypisany do projektu"}
                      </Badge>
                    </td>
                    {ROLE_FIELDS.map(({ field }) => {
                      const key = `${profile.id}:${field}`;
                      return (
                        <td key={field} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-blue-500 disabled:opacity-50"
                            checked={profile[field]}
                            disabled={!canEditRoles || busyKey === key}
                            onChange={(event) =>
                              void toggleRole(profile.id, field, event.target.checked)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="grid gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{getUserDisplayName(profile)}</p>
                    <Badge tone="blue">{USER_ROLE_LABELS[profile.role]}</Badge>
                  </div>
                  <p className="text-sm text-muted">{profile.email}</p>
                  <Badge tone={profileHasAllProjectsAccess(profile) ? "blue" : "neutral"}>
                    {profileHasAllProjectsAccess(profile)
                      ? "Wszystkie projekty"
                      : "Przypisany do projektu"}
                  </Badge>
                  <div className="mt-1 grid gap-1.5">
                    {ROLE_FIELDS.map(({ field, label }) => {
                      const key = `${profile.id}:${field}`;
                      return (
                        <label key={field} className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-blue-500 disabled:opacity-50"
                            checked={profile[field]}
                            disabled={!canEditRoles || busyKey === key}
                            onChange={(event) =>
                              void toggleRole(profile.id, field, event.target.checked)
                            }
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
