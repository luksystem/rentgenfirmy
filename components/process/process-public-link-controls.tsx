"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { ProcessItemKind } from "@/lib/process/types";
import { getProcessPublicUrl } from "@/lib/process/public-link-paths";
import { getSupabase } from "@/lib/supabase/client";
import {
  ensureProcessPublicAccess,
  setProcessPublicEnabled,
  type ProcessPublicAccessRecord,
} from "@/lib/supabase/process-public-access-repository";

export function ProcessPublicLinkControls({
  projectProcessItemId,
  kind,
  isInternalAcceptance = false,
  title = "Link publiczny",
}: {
  projectProcessItemId: string;
  kind: ProcessItemKind;
  isInternalAcceptance?: boolean;
  title?: string;
}) {
  const [access, setAccess] = useState<ProcessPublicAccessRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureProcessPublicAccess(getSupabase(), projectProcessItemId)
      .then((record) => {
        if (!cancelled) {
          setAccess(record);
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
      const record = await setProcessPublicEnabled(getSupabase(), projectProcessItemId, enabled);
      setAccess(record);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Nie udało się zmienić dostępu.");
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
        {title}
        <span className="text-xs text-muted">{open ? "Zwiń" : "Rozwiń"}</span>
      </button>
      {open ? (
        <div className="grid gap-3">
          <p className="text-xs text-muted">
            Udostępnij link podwykonawcy, instalatorowi lub pracownikowi sprawdzającemu — bez logowania do
            systemu (opcjonalnie z hasłem w kolejnej fazie).
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
          <Field label="Login publiczny (wkrótce)">
            <Input value={access.publicAccessUsername ?? ""} disabled placeholder="Opcjonalne zabezpieczenie" />
          </Field>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
