"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function UserSlackEditor({ userId }: { userId: string }) {
  const [slackUserId, setSlackUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaved(false);
    fetch(`/api/profiles/${userId}/slack`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { slackUserId: null }))
      .then((payload: { slackUserId: string | null }) => {
        if (!cancelled) setSlackUserId(payload.slackUserId ?? "");
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/profiles/${userId}/slack`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackUserId: slackUserId.trim() || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Nie udało się zapisać Slack ID.");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać Slack ID.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold text-foreground">Integracje — Slack</h3>
      <p className="text-xs text-muted">
        ID użytkownika w Slacku (np. U0123ABC456, widoczne pod „Copy member ID” w profilu Slacka) — do wysyłki DM
        z Planu Zasobów („Roześlij plan”). Bez tego wiadomość trafi na e-mail.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Field label="Slack ID" className="w-56">
          <Input
            value={slackUserId}
            disabled={loading}
            placeholder="U0123ABC456"
            onChange={(event) => setSlackUserId(event.target.value)}
          />
        </Field>
        <Button type="button" variant="secondary" disabled={loading || saving} onClick={() => void save()}>
          {saving ? "Zapisywanie…" : "Zapisz"}
        </Button>
        {saved ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Zapisano
          </span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
