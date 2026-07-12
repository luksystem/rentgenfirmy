"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import type { UserProfile } from "@/lib/auth/types";
import { roleHasImplicitAllProjects } from "@/lib/project-access/rules";
import {
  fetchUserProjectAccess,
  saveUserProjectAccess,
} from "@/lib/supabase/project-access-repository";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function UserProjectAccessEditor({ user }: { user: UserProfile }) {
  const projects = useAppStore((state) => state.projects);
  const initialize = useAppStore((state) => state.initialize);
  const isInitialized = useAppStore((state) => state.isInitialized);

  const [allProjectsAccess, setAllProjectsAccess] = useState(true);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isAdmin = roleHasImplicitAllProjects(user.role);

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchUserProjectAccess(user.id)
      .then((access) => {
        if (cancelled) return;
        setAllProjectsAccess(access.allProjectsAccess);
        setProjectIds(access.projectIds);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Błąd wczytywania dostępu.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(q));
  }, [projects, query]);

  const selectedSet = useMemo(() => new Set(projectIds), [projectIds]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveUserProjectAccess(user.id, {
        allProjectsAccess: isAdmin ? true : allProjectsAccess,
        projectIds: isAdmin || allProjectsAccess ? [] : projectIds,
      });
      setAllProjectsAccess(saved.allProjectsAccess);
      setProjectIds(saved.projectIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  function toggleProject(projectId: string) {
    setProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie dostępu do projektów…</p>;
  }

  if (isAdmin) {
    return (
      <div className="rounded-lg border border-border/70 bg-surface-muted/20 p-3 text-sm text-muted">
        Administrator ma domyślnie dostęp do <strong>wszystkich projektów</strong>. Ograniczenia nie
        dotyczą tej roli.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Dostęp do projektów</p>
        <p className="mt-1 text-xs text-muted">
          Użytkownik bez dostępu do projektu nie widzi go na liście i nie może być do niego
          przypisany w zadaniach.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allProjectsAccess}
          onChange={(event) => setAllProjectsAccess(event.target.checked)}
        />
        Dostęp do wszystkich projektów
      </label>

      {!allProjectsAccess ? (
        <>
          <Field label="Szukaj projektu">
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nazwa projektu…"
            />
          </Field>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/70 p-2">
            {filteredProjects.map((project) => {
              const selected = selectedSet.has(project.id);
              return (
                <label
                  key={project.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted/40",
                    selected && "bg-surface-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleProject(project.id)}
                  />
                  <span className="truncate">{project.name}</span>
                </label>
              );
            })}
            {!filteredProjects.length ? (
              <p className="px-2 py-3 text-center text-xs text-muted">Brak projektów do wyświetlenia.</p>
            ) : null}
          </div>
          <p className="text-xs text-muted">Wybrane projekty: {projectIds.length}</p>
        </>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Zapisywanie…" : "Zapisz dostęp do projektów"}
      </Button>
    </div>
  );
}
