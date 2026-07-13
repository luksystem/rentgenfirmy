"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLE_LABELS, getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { profileHasAllProjectsAccess } from "@/lib/project-access/rules";
import { fetchProjectAccessibleProfiles } from "@/lib/supabase/project-access-repository";

export function ProjectUsersPanel({ projectId }: { projectId: string }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie użytkowników…</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Osoby z dostępem do tego projektu — administratorzy, użytkownicy z pełnym dostępem oraz
        osoby przypisane w module Użytkownicy.
      </p>

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
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Dostęp</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {getUserDisplayName(profile)}
                    </td>
                    <td className="px-4 py-3 text-muted">{USER_ROLE_LABELS[profile.role]}</td>
                    <td className="px-4 py-3 text-muted">{profile.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={profileHasAllProjectsAccess(profile) ? "blue" : "neutral"}>
                        {profileHasAllProjectsAccess(profile)
                          ? "Wszystkie projekty"
                          : "Przypisany do projektu"}
                      </Badge>
                    </td>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
