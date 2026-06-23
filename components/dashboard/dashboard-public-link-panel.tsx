"use client";

import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardPublicUrl } from "@/lib/dashboard/types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useDashboardStore } from "@/store/dashboard-store";

export function DashboardPublicLinkPanel({ space: spaceProp }: { space: DashboardSpace }) {
  const togglePublicLink = useDashboardStore((state) => state.togglePublicLink);
  const space = useDashboardStore(
    (state) => state.spaces.find((entry) => entry.id === spaceProp.id) ?? spaceProp,
  );
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accessPasswordDraft, setAccessPasswordDraft] = useState("");
  const [accessUsername, setAccessUsername] = useState("");
  const [accessAuthorName, setAccessAuthorName] = useState("");
  const publicUrl = getDashboardPublicUrl(space.publicToken);

  useEffect(() => {
    setAccessUsername("");
    setAccessAuthorName(space.publicAuthorName === "Klient" ? "" : space.publicAuthorName);
  }, [space.id, space.publicAuthorName]);

  async function handleToggle() {
    const nextEnabled = !space.publicEnabled;
    setSaving(true);
    setMessage(null);
    try {
      await togglePublicLink(space.id, nextEnabled);
      setMessage(nextEnabled ? "Link publiczny włączony." : "Link publiczny wyłączony.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Link skopiowany.");
  }

  async function handleSaveAccess() {
    setAccessSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/dashboard/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: space.id,
          password: accessPasswordDraft.trim() ? accessPasswordDraft : undefined,
          username: accessUsername.trim() || null,
          authorName: accessAuthorName.trim() || space.publicAuthorName,
        }),
      });
      const payload = (await response.json()) as { error?: string; space?: DashboardSpace };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać ustawień.");
      }
      if (payload.space) {
        useDashboardStore.setState({
          spaces: useDashboardStore.getState().spaces.map((entry) =>
            entry.id === payload.space!.id ? payload.space! : entry,
          ),
        });
      }
      setAccessPasswordDraft("");
      setMessage("Ustawienia dostępu zapisane.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Błąd zapisu.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleClearPassword() {
    setAccessSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/dashboard/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId: space.id, password: null }),
      });
      const payload = (await response.json()) as { error?: string; space?: DashboardSpace };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć hasła.");
      }
      if (payload.space) {
        useDashboardStore.setState({
          spaces: useDashboardStore.getState().spaces.map((entry) =>
            entry.id === payload.space!.id ? payload.space! : entry,
          ),
        });
      }
      setMessage("Hasło zostało usunięte.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Błąd zapisu.");
    } finally {
      setAccessSaving(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-border/80 bg-surface-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Link publiczny</p>
          <p className="mt-1 text-xs text-muted">
            Udostępnij dashboard klientowi — zabezpiecz hasłem jak tablicę Kanban.
          </p>
        </div>
        <Button
          type="button"
          variant={space.publicEnabled ? "secondary" : "default"}
          size="sm"
          disabled={saving}
          className="w-full shrink-0 sm:w-auto"
          onClick={() => void handleToggle()}
        >
          {space.publicEnabled ? "Wyłącz link" : "Włącz link"}
        </Button>
      </div>

      {space.publicEnabled ? (
        <div className="mt-3 grid min-w-0 gap-2">
          <code className="block w-full min-w-0 break-all rounded-lg border border-border/60 bg-black/30 px-2 py-1 text-xs">
            {publicUrl}
          </code>
          <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
            <Copy className="mr-2 h-4 w-4" />
            Kopiuj
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/przestrzen/${space.publicToken}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Podgląd
            </Link>
          </Button>
          </div>
        </div>
      ) : null}

      {space.publicEnabled ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-surface/40 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Hasło dostępu klienta</p>
            <p className="mt-1 text-xs text-muted">
              {space.publicAccessConfigured
                ? "Link wymaga hasła (i opcjonalnie loginu)."
                : "Ustaw hasło, aby zabezpieczyć dashboard — bez hasła link jest otwarty."}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="Nowe hasło">
              <Input
                type="password"
                value={accessPasswordDraft}
                placeholder={space.publicAccessConfigured ? "Zostaw puste, aby nie zmieniać" : "Hasło dla klienta"}
                autoComplete="new-password"
                onChange={(event) => setAccessPasswordDraft(event.target.value)}
              />
            </Field>
            <Field label="Login (opcjonalnie)">
              <Input
                value={accessUsername}
                placeholder="Wymagany login klienta"
                autoComplete="username"
                onChange={(event) => setAccessUsername(event.target.value)}
              />
            </Field>
            <Field label="Nazwa klienta w historii" className="md:col-span-2">
              <Input
                value={accessAuthorName}
                placeholder={space.publicAuthorName}
                onChange={(event) => setAccessAuthorName(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={accessSaving} onClick={() => void handleSaveAccess()}>
              {accessSaving ? "Zapisywanie…" : "Zapisz dostęp"}
            </Button>
            {space.publicAccessConfigured ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={accessSaving}
                onClick={() => void handleClearPassword()}
              >
                Usuń hasło
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
