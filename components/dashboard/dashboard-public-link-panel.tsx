"use client";

import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { getDashboardPublicUrl } from "@/lib/dashboard/types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/store/dashboard-store";

export function DashboardPublicLinkPanel({ space }: { space: DashboardSpace }) {
  const togglePublicLink = useDashboardStore((state) => state.togglePublicLink);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const publicUrl = getDashboardPublicUrl(space.publicToken);

  async function handleToggle() {
    setSaving(true);
    setMessage(null);
    try {
      await togglePublicLink(space.id, !space.publicEnabled);
      setMessage(space.publicEnabled ? "Link publiczny wyłączony." : "Link publiczny włączony.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Link skopiowany.");
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Link publiczny</p>
          <p className="mt-1 text-xs text-muted">
            Udostępnij dashboard klientowi bez logowania do aplikacji (podobnie jak tablica Kanban).
          </p>
        </div>
        <Button
          type="button"
          variant={space.publicEnabled ? "secondary" : "default"}
          size="sm"
          disabled={saving}
          onClick={() => void handleToggle()}
        >
          {space.publicEnabled ? "Wyłącz link" : "Włącz link"}
        </Button>
      </div>

      {space.publicEnabled ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg border border-border/60 bg-black/30 px-2 py-1 text-xs">
            {publicUrl}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
            <Copy className="mr-2 h-4 w-4" />
            Kopiuj
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Podgląd
            </Link>
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
