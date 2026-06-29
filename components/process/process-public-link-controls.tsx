"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { ProcessItemKind } from "@/lib/process/types";
import { getProcessPublicUrl } from "@/lib/process/public-link-paths";
import type { ProcessPublicAccessRecord } from "@/lib/supabase/process-public-access-repository";

export function ProcessPublicLinkControls({
  projectProcessItemId,
  kind,
  isInternalAcceptance = false,
  defaultOpen = true,
}: {
  projectProcessItemId: string;
  kind: ProcessItemKind;
  isInternalAcceptance?: boolean;
  defaultOpen?: boolean;
}) {
  const [access, setAccess] = useState<ProcessPublicAccessRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(defaultOpen);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessPasswordDraft, setAccessPasswordDraft] = useState("");
  const [accessUsername, setAccessUsername] = useState("");
  const [accessAuthorName, setAccessAuthorName] = useState("");
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/process/public-access?projectProcessItemId=${encodeURIComponent(projectProcessItemId)}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Błąd ładowania linku publicznego.");
        }
        return response.json() as Promise<{ access: ProcessPublicAccessRecord }>;
      })
      .then((payload) => {
        if (!cancelled) {
          setAccess(payload.access);
          setAccessUsername(payload.access.publicAccessUsername ?? "");
          setAccessAuthorName(payload.access.publicAuthorName ?? "");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Błąd ładowania linku.");
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
  }, [projectProcessItemId]);

  async function handleTogglePublic(enabled: boolean) {
    setError(null);
    try {
      const response = await fetch("/api/process/public-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectProcessItemId,
          enabled,
        }),
      });
      const payload = (await response.json()) as { access?: ProcessPublicAccessRecord; error?: string };
      if (!response.ok || !payload.access) {
        throw new Error(payload.error ?? "Nie udało się zmienić dostępu.");
      }
      setAccess(payload.access);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Nie udało się zmienić dostępu.");
    }
  }

  async function handleSaveAccessSettings() {
    setAccessSaving(true);
    setAccessMessage(null);
    setAccessError(null);
    try {
      const response = await fetch("/api/process/public-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectProcessItemId,
          password: accessPasswordDraft.trim() ? accessPasswordDraft : undefined,
          username: accessUsername.trim() || null,
          authorName: accessAuthorName.trim() || null,
        }),
      });
      const payload = (await response.json()) as { access?: ProcessPublicAccessRecord; error?: string };
      if (!response.ok || !payload.access) {
        throw new Error(payload.error ?? "Nie udało się zapisać ustawień dostępu.");
      }
      setAccess(payload.access);
      setAccessPasswordDraft("");
      setAccessMessage("Ustawienia dostępu zapisane.");
    } catch (saveError) {
      setAccessError(saveError instanceof Error ? saveError.message : "Błąd zapisu dostępu.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleClearAccessPassword() {
    setAccessSaving(true);
    setAccessError(null);
    try {
      const response = await fetch("/api/process/public-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectProcessItemId,
          password: null,
        }),
      });
      const payload = (await response.json()) as { access?: ProcessPublicAccessRecord; error?: string };
      if (!response.ok || !payload.access) {
        throw new Error(payload.error ?? "Nie udało się usunąć hasła.");
      }
      setAccess(payload.access);
      setAccessPasswordDraft("");
      setAccessMessage("Hasło usunięte.");
    } catch (clearError) {
      setAccessError(clearError instanceof Error ? clearError.message : "Błąd usuwania hasła.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function copyPublicLink() {
    if (!access?.publicToken) {
      return;
    }
    const url = getProcessPublicUrl(kind, access.publicToken, { isInternalAcceptance });
    await navigator.clipboard.writeText(url);
    setLinkMessage("Link skopiowany.");
  }

  if (loading) {
    return <p className="text-sm text-muted">Przygotowywanie linku publicznego…</p>;
  }

  if (!access) {
    return error ? <p className="text-sm text-rose-400">{error}</p> : null;
  }

  const publicPath = getProcessPublicUrl(kind, access.publicToken, { isInternalAcceptance });

  return (
    <div className="grid shrink-0 gap-2 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        Link publiczny i dostęp
        <span className="text-xs text-muted">{open ? "Zwiń" : "Rozwiń"}</span>
      </button>
      {open ? (
        <div className="grid gap-3">
          <p className="text-xs text-muted">
            Udostępnij checklistę, protokół lub odbiór wewnętrzny podwykonawcy lub pracownikowi — tak
            jak tablicę Kanban.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={access.publicEnabled ? "default" : "secondary"}
              onClick={() => void handleTogglePublic(!access.publicEnabled)}
            >
              {access.publicEnabled ? "Link publiczny włączony" : "Włącz link publiczny"}
            </Button>
            {access.publicEnabled ? (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={() => void copyPublicLink()}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Kopiuj link
                </Button>
                <a
                  href={publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Podgląd publiczny
                </a>
              </>
            ) : null}
            {linkMessage ? <span className="text-xs text-emerald-400">{linkMessage}</span> : null}
          </div>

          <div className="grid gap-3 rounded-xl border border-border/60 bg-surface/40 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Hasło dostępu</p>
              <p className="mt-1 text-xs text-muted">
                {access.publicAccessConfigured
                  ? "Link wymaga hasła (i opcjonalnie loginu)."
                  : "Brak hasła — gość wchodzi bez logowania. Ustaw hasło, aby zabezpieczyć link."}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Nowe hasło">
                <Input
                  type="password"
                  value={accessPasswordDraft}
                  placeholder={access.publicAccessConfigured ? "Zostaw puste, aby nie zmieniać" : "Hasło dla gościa"}
                  autoComplete="new-password"
                  onChange={(event) => setAccessPasswordDraft(event.target.value)}
                />
              </Field>
              <Field label="Login (opcjonalnie)">
                <Input
                  value={accessUsername}
                  placeholder="Wymagany login gościa"
                  autoComplete="username"
                  onChange={(event) => setAccessUsername(event.target.value)}
                />
              </Field>
              <Field label="Nazwa w historii (bez loginu)" className="md:col-span-2">
                <Input
                  value={accessAuthorName}
                  placeholder={access.publicAuthorName ?? "Gość"}
                  onChange={(event) => setAccessAuthorName(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={accessSaving} onClick={() => void handleSaveAccessSettings()}>
                {accessSaving ? "Zapisywanie…" : "Zapisz dostęp"}
              </Button>
              {access.publicAccessConfigured ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={accessSaving}
                  onClick={() => void handleClearAccessPassword()}
                >
                  Usuń hasło
                </Button>
              ) : null}
            </div>
            {accessMessage ? <p className="text-xs text-emerald-400">{accessMessage}</p> : null}
            {accessError ? <p className="text-xs text-rose-400">{accessError}</p> : null}
          </div>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
