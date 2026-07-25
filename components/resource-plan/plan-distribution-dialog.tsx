"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, Send, Settings2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";

type DistributionResult = {
  kind: "employee" | "client" | "admin";
  recipientId: string;
  recipientName: string;
  channel: string;
  ok: boolean;
  error?: string;
  subject?: string;
  message?: string;
};

function toDateInputValue(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function PlanDistributionDialog({
  open,
  onOpenChange,
  defaultFrom,
  defaultTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFrom: string;
  defaultTo: string;
}) {
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const allItems = useResourcePlanStore((state) => state.allItems());

  const [from, setFrom] = useState(toDateInputValue(defaultFrom));
  const [to, setTo] = useState(toDateInputValue(defaultTo));
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [slackDrafts, setSlackDrafts] = useState<Record<string, string>>({});
  const [slackKnown, setSlackKnown] = useState<Record<string, string | null>>({});
  const [clientSettings, setClientSettings] = useState<
    Record<string, { channel: "email" | "sms"; messageType: "summary" | "offer_notice" }>
  >({});
  const [notifyAdmins, setNotifyAdmins] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"idle" | "preview" | "sent">("idle");
  const [results, setResults] = useState<DistributionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadTeamProfiles();
    setFrom(toDateInputValue(defaultFrom));
    setTo(toDateInputValue(defaultTo));
    setResults(null);
    setMode("idle");
    setError(null);
  }, [open, loadTeamProfiles, defaultFrom, defaultTo]);

  useEffect(() => {
    if (!open || teamProfiles.length === 0) return;
    let cancelled = false;
    Promise.all(
      teamProfiles.map(async (profile) => {
        const response = await fetch(`/api/profiles/${profile.id}/slack`, { credentials: "include" });
        if (!response.ok) return [profile.id, null] as const;
        const payload = (await response.json()) as { slackUserId: string | null };
        return [profile.id, payload.slackUserId] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setSlackKnown(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [open, teamProfiles]);

  const rangeItems = useMemo(() => {
    const fromIso = `${from}T00:00:00`;
    const toIso = `${to}T23:59:59`;
    return allItems.filter((item) => item.startAt <= toIso && item.endAt >= fromIso);
  }, [allItems, from, to]);

  const candidateClientIds = useMemo(() => {
    const ids = new Set<string>();
    rangeItems.forEach((item) => {
      if (item.clientId) {
        ids.add(item.clientId);
      } else if (item.projectId) {
        const project = projects.find((p) => p.id === item.projectId);
        if (project?.clientId) ids.add(project.clientId);
      }
    });
    return ids;
  }, [rangeItems, projects]);

  const candidateClients = clients.filter((client) => candidateClientIds.has(client.id));

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveSlackId(profileId: string) {
    const value = slackDrafts[profileId]?.trim() ?? "";
    const response = await fetch(`/api/profiles/${profileId}/slack`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackUserId: value || null }),
    });
    if (response.ok) {
      setSlackKnown((current) => ({ ...current, [profileId]: value || null }));
    }
  }

  function buildRequestBody(dryRun: boolean) {
    return {
      from,
      to,
      employeeIds: [...selectedEmployeeIds],
      clientSelections: Object.entries(clientSettings)
        .filter(([clientId]) => candidateClientIds.has(clientId))
        .map(([clientId, settings]) => ({ clientId, ...settings })),
      notifyAdmins,
      dryRun,
    };
  }

  async function runDistribute(dryRun: boolean) {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/resource-plan/distribute", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(dryRun)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Nie udało się przygotować rozsyłki.");
      }
      setResults(payload.results ?? []);
      setMode(dryRun ? "preview" : "sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przygotować rozsyłki.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Roześlij plan
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Od">
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </Field>
            <Field label="Do">
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-foreground">Pracownicy — dostają plan na Slacku (jeśli ustawione ID) albo mailem</p>
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-border/70 p-2">
              {teamProfiles.map((profile) => (
                <div key={profile.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.has(profile.id)}
                      onChange={() => toggleEmployee(profile.id)}
                    />
                    {getUserDisplayName(profile)}
                  </label>
                  <Input
                    className="h-7 w-40 text-[11px]"
                    placeholder={slackKnown[profile.id] ? slackKnown[profile.id]! : "Slack ID (opcjonalnie)"}
                    value={slackDrafts[profile.id] ?? ""}
                    onChange={(event) => setSlackDrafts((current) => ({ ...current, [profile.id]: event.target.value }))}
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => void saveSlackId(profile.id)}>
                    Zapisz
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-foreground">
              Klienci z pracami w tym okresie — wybierz kanał i treść
            </p>
            <p className="text-[11px] text-muted">
              „Podsumowanie” zbiera zakończone elementy z feedbackiem pracownika + zaplanowane terminy. „Info o ofercie”
              to krótka zapowiedź — samą ofertę wysyłasz osobno z modułu Oferty.
            </p>
            {candidateClients.length === 0 ? (
              <p className="text-xs text-muted">Brak klientów z elementami planu w wybranym zakresie.</p>
            ) : (
              <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-border/70 p-2">
                {candidateClients.map((client) => {
                  const selected = clientSettings[client.id];
                  return (
                    <div key={client.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <label className="flex flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={(event) =>
                            setClientSettings((current) => {
                              const next = { ...current };
                              if (event.target.checked) {
                                next[client.id] = next[client.id] ?? { channel: "email", messageType: "summary" };
                              } else {
                                delete next[client.id];
                              }
                              return next;
                            })
                          }
                        />
                        {client.firstName} {client.lastName}
                      </label>
                      <select
                        disabled={!selected}
                        className="h-7 rounded-md border border-border/70 bg-surface px-1 text-[11px]"
                        value={selected?.channel ?? "email"}
                        onChange={(event) =>
                          setClientSettings((current) => ({
                            ...current,
                            [client.id]: {
                              channel: event.target.value as "email" | "sms",
                              messageType: current[client.id]?.messageType ?? "summary",
                            },
                          }))
                        }
                      >
                        <option value="email">E-mail</option>
                        <option value="sms">SMS</option>
                      </select>
                      <select
                        disabled={!selected}
                        className="h-7 rounded-md border border-border/70 bg-surface px-1 text-[11px]"
                        value={selected?.messageType ?? "summary"}
                        onChange={(event) =>
                          setClientSettings((current) => ({
                            ...current,
                            [client.id]: {
                              channel: current[client.id]?.channel ?? "email",
                              messageType: event.target.value as "summary" | "offer_notice",
                            },
                          }))
                        }
                      >
                        <option value="summary">Podsumowanie</option>
                        <option value="offer_notice">Info o ofercie</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={notifyAdmins} onChange={(event) => setNotifyAdmins(event.target.checked)} />
            Wyślij podsumowanie do administratorów (e-mail)
          </label>

          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Settings2 className="h-3 w-3 shrink-0" />
            Treść tych wiadomości (temat, tekst) edytujesz w{" "}
            <Link href="/ustawienia/email" className="underline underline-offset-2" target="_blank">
              Ustawienia → E-mail → Plan zasobów — rozsyłanie
            </Link>
            .
          </p>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          ) : null}

          {mode !== "sent" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={sending || (selectedEmployeeIds.size === 0 && Object.keys(clientSettings).length === 0 && !notifyAdmins)}
                onClick={() => void runDistribute(true)}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                {sending && mode === "idle" ? "Przygotowywanie…" : "Pokaż podgląd"}
              </Button>
              {mode === "preview" ? (
                <Button type="button" disabled={sending} onClick={() => void runDistribute(false)}>
                  <Send className="mr-1.5 h-4 w-4" />
                  {sending ? "Wysyłanie…" : `Wyślij (${results?.length ?? 0})`}
                </Button>
              ) : null}
            </div>
          ) : null}

          {results ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium text-foreground">
                {mode === "preview" ? "Podgląd — jeszcze nic nie zostało wysłane" : "Wynik wysyłki"}
              </p>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "grid gap-1 rounded-lg border px-2 py-1.5 text-xs",
                    result.ok
                      ? mode === "preview"
                        ? "border-border/70 bg-surface"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {mode === "sent" ? (
                      result.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                      )
                    ) : null}
                    <span className="font-medium">{result.recipientName}</span>
                    <span className="text-muted">({result.channel})</span>
                    {result.error ? <span>— {result.error}</span> : null}
                  </div>
                  {result.message ? (
                    <div className="rounded-md bg-surface-muted/40 p-2 text-[11px] whitespace-pre-line text-foreground/80">
                      {result.subject ? <div className="mb-1 font-medium text-foreground">{result.subject}</div> : null}
                      {result.message}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
