"use client";

import { useCallback, useEffect, useState } from "react";
import { PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DIRECTION_LABELS,
  COMMUNICATION_SOURCE_LABELS,
  SILENCE_STATE_LABELS,
  daysSinceOurContact,
  resolveSilenceState,
  type CommunicationEventEntry,
  type ProjectActivityAxes,
  type SilenceState,
} from "@/lib/communication/types";
import { DEFAULT_POLICY_THRESHOLDS } from "@/lib/policy-thresholds/types";
import {
  fetchCommunicationEvents,
  logOutgoingContact,
} from "@/lib/supabase/communication-repository";
import { fetchPolicyThresholds } from "@/lib/supabase/policy-thresholds-repository";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const SILENCE_TONES: Record<SilenceState, "active" | "waiting" | "critical"> = {
  zdrowo: "active",
  klient_milczy: "waiting",
  my_nie_reagujemy: "critical",
  obie_ciche: "critical",
};

function todayInputValue() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Faza 9A (docs/08 D18/D19 §5) — jeden przycisk „Odezwaliśmy się do klienta" + rejestr zdarzeń.
 *
 * Przycisk ustawia WYŁĄCZNIE naszą oś (`wychodzace`). Oś kliencka idzie tylko ze źródeł
 * automatycznych — gdy nie odpowiadamy, nikt nie kliknie, więc ręczne łapanie kierunku od klienta
 * systematycznie zawyżałoby kontakt i zamaskowałoby najgroźniejszy przypadek z czterech.
 */
export function ProjectCommunicationPanel({
  projectId,
  axes,
  onLogged,
}: {
  projectId: string;
  axes: ProjectActivityAxes;
  onLogged?: () => void | Promise<void>;
}) {
  const profile = useAuthStore((state) => state.profile);
  const [events, setEvents] = useState<CommunicationEventEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [eventDate, setEventDate] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const [silenceDays, setSilenceDays] = useState(
    DEFAULT_POLICY_THRESHOLDS.silenceTimeoutInProgressDays,
  );

  const load = useCallback(async () => {
    try {
      setEvents(await fetchCommunicationEvents(projectId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać rejestru.");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    void fetchPolicyThresholds()
      .then((thresholds) => setSilenceDays(thresholds.silenceTimeoutInProgressDays))
      .catch(() => undefined);
  }, [load]);

  const silenceState = resolveSilenceState(axes, silenceDays);
  const ourAge = daysSinceOurContact(axes);

  async function handleLog() {
    setSaving(true);
    setError(null);
    try {
      // Data wsteczna: dopinamy południe lokalne, żeby wpis nie wpadł na poprzedni dzień w UTC.
      await logOutgoingContact({
        projectId,
        eventAt: new Date(`${eventDate}T12:00:00`).toISOString(),
        actorId: profile?.id ?? null,
        actorName: profile ? getUserDisplayName(profile) : "Zespół",
        note,
      });
      setNote("");
      setEventDate(todayInputValue());
      setExpanded(false);
      await load();
      await onLogged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać kontaktu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Kontakt z klientem</p>
          <Badge tone={SILENCE_TONES[silenceState]} className="text-[10px]">
            {SILENCE_STATE_LABELS[silenceState]}
          </Badge>
          <span className="text-xs text-muted">
            {ourAge === null
              ? "Nie odezwaliśmy się ani razu"
              : ourAge === 0
                ? "Odezwaliśmy się dziś"
                : `Od naszego kontaktu: ${ourAge} dni`}
          </span>
        </div>
        <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => setExpanded((v) => !v)}>
          <PhoneOutgoing className="mr-1.5 h-4 w-4" />
          Odezwaliśmy się do klienta
        </Button>
      </div>

      {expanded ? (
        <Card>
          <CardContent className="grid gap-3 py-4">
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <Field label="Kiedy">
                <Input
                  type="date"
                  value={eventDate}
                  max={todayInputValue()}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </Field>
              <Field label="Czego dotyczyło (opcjonalnie)">
                <Textarea
                  value={note}
                  rows={2}
                  placeholder="np. telefon o terminie montażu"
                  onChange={(event) => setNote(event.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted">
              Zapisujemy tylko fakt kontaktu i datę — nie treść rozmowy. Datę można wpisać wstecznie;
              przyszłej nie przyjmiemy.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded(false)}>
                Anuluj
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void handleLog()}>
                {saving ? "Zapisywanie…" : "Zapisz kontakt"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {events === null ? (
        <p className="text-sm text-muted">Ładowanie rejestru…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">Brak zarejestrowanych zdarzeń komunikacyjnych.</p>
      ) : (
        <div className="grid gap-2">
          {events.slice(0, 20).map((entry, index) => (
            <div
              key={`${entry.source}-${entry.eventAt}-${index}`}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-muted/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="min-w-0 break-words text-sm text-foreground">{entry.title}</p>
                <p className="text-xs text-muted">
                  {formatDate(entry.eventAt)} · {entry.actorName}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Badge
                  tone={entry.direction === "przychodzace" ? "blue" : "neutral"}
                  className="text-[10px]"
                >
                  {COMMUNICATION_DIRECTION_LABELS[entry.direction]}
                </Badge>
                <Badge tone="neutral" className="text-[10px]">
                  {COMMUNICATION_SOURCE_LABELS[entry.source] ??
                    COMMUNICATION_CHANNEL_LABELS[entry.channel] ??
                    entry.source}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
