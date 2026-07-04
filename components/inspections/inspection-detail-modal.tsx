"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { isInspectionPlanningDue } from "@/lib/inspections/schedule";
import {
  INSPECTION_REACTION_EMOJIS,
  INSPECTION_STATUS_LABELS,
  type InspectionRecord,
  type InspectionStatus,
} from "@/lib/inspections/types";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { useAuthStore } from "@/store/auth-store";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export function InspectionDetailModal({
  item,
  open,
  onClose,
  onUpdated,
}: {
  item: InspectionRecord | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (item: InspectionRecord) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const [detail, setDetail] = useState<InspectionRecord | null>(item);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedDate, setConfirmedDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [protocolNotes, setProtocolNotes] = useState("");

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setLoading(true);
    setError(null);
    void fetch(`/api/inspections/${item.id}`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie udało się wczytać szczegółów.");
        }
        const loaded = payload.item as InspectionRecord;
        setDetail(loaded);
        setConfirmedDate(loaded.confirmedDate ?? "");
        setAssigneeId(loaded.assigneeId ?? "");
        setProtocolNotes(String(loaded.protocolData.notes ?? ""));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Błąd.");
      })
      .finally(() => setLoading(false));
  }, [open, item]);

  useEffect(() => {
    void fetchTeamProfiles()
      .then(setTeamProfiles)
      .catch(() => setTeamProfiles([]));
  }, []);

  if (!item) {
    return null;
  }

  const planningDue =
    detail &&
    isInspectionPlanningDue({
      preliminaryDate: detail.preliminaryDate,
      confirmedDate: detail.confirmedDate,
      status: detail.status,
    });

  async function patchDetail(body: Record<string, unknown>) {
    if (!detail) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/inspections/${detail.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać.");
      }
      const updated = payload.item as InspectionRecord;
      setDetail(updated);
      onUpdated(updated);
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommentSubmit() {
    if (!detail || !comment.trim()) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/inspections/${detail.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: comment,
          authorName: profile ? getUserDisplayName(profile) : "Zespół",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się dodać komentarza.");
      }

      const reload = await fetch(`/api/inspections/${detail.id}`, { credentials: "include" });
      const reloadPayload = await reload.json();
      if (reload.ok) {
        setDetail(reloadPayload.item as InspectionRecord);
      }
      setComment("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReaction(emoji: (typeof INSPECTION_REACTION_EMOJIS)[number]) {
    if (!detail) {
      return;
    }

    setBusy(true);
    try {
      await fetch(`/api/inspections/${detail.id}/reactions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji,
          authorName: profile ? getUserDisplayName(profile) : "Zespół",
        }),
      });
      const reload = await fetch(`/api/inspections/${detail.id}`, { credentials: "include" });
      const reloadPayload = await reload.json();
      if (reload.ok) {
        setDetail(reloadPayload.item as InspectionRecord);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handlePlanConfirm() {
    if (!confirmedDate) {
      setError("Ustaw konkretną datę wizyty.");
      return;
    }

    await patchDetail({
      status: "planned",
      confirmedDate,
      assigneeId: assigneeId || null,
    });
  }

  async function handleComplete() {
    const now = new Date().toISOString();
    const signer = profile ? getUserDisplayName(profile) : "Zespół serwisowy";

    await patchDetail({
      status: "completed",
      protocolData: { ...detail?.protocolData, notes: protocolNotes },
      protocolCompanySignedAt: now,
      protocolClientSignedAt: now,
      protocolCompanySigner: signer,
      protocolClientSigner: detail?.protocolClientSigner ?? "Przedstawiciel klienta",
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.title ?? item.title}</DialogTitle>
          <DialogDescription>
            {detail?.clientName ?? item.clientName} · {detail?.systemLabel ?? item.systemLabel}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wczytywanie…
          </div>
        ) : detail ? (
          <div className="grid gap-4">
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            {planningDue ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Ten przegląd wymaga potwierdzenia konkretnej daty (max 3 tygodnie przed terminem
                wstępnym).
              </p>
            ) : null}

            <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/15 p-3 text-sm">
              <p>
                <span className="text-muted">Status:</span> {INSPECTION_STATUS_LABELS[detail.status]}
              </p>
              {detail.preliminaryDate ? (
                <p>
                  <span className="text-muted">Data wstępna:</span> {formatDate(detail.preliminaryDate)}
                </p>
              ) : null}
              {detail.projectName ? (
                <p>
                  <span className="text-muted">Projekt:</span> {detail.projectName}
                </p>
              ) : null}
              {detail.workScope ? (
                <p>
                  <span className="text-muted">Zakres prac:</span> {detail.workScope}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Konkretna data wizyty">
                <Input
                  type="date"
                  value={confirmedDate}
                  onChange={(event) => setConfirmedDate(event.target.value)}
                />
              </Field>
              <Field label="Osoba wykonująca">
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
                >
                  <option value="">— wybierz —</option>
                  {teamProfiles.map((member) => (
                    <option key={member.id} value={member.id}>
                      {getUserDisplayName(member)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void handlePlanConfirm()}>
                Zapisz i zaplanuj
              </Button>
              {(["quoting", "preliminary", "planned", "completed"] as InspectionStatus[]).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={detail.status === status ? "default" : "outline"}
                  disabled={busy || detail.status === status}
                  onClick={() => void patchDetail({ status })}
                >
                  {INSPECTION_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>

            <div className="rounded-xl border border-border/70 p-3">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <p className="font-medium text-foreground">Protokół serwisowy</p>
              </div>
              <p className="mb-3 text-xs text-muted">
                Wzór protokołu przypisany do firmy/systemu. Uzupełnij notatki z wizyty i podpisz po
                zakończeniu (tablet / podpis elektroniczny — MVP).
              </p>
              <Field label="Notatki do protokołu">
                <Textarea
                  rows={4}
                  value={protocolNotes}
                  onChange={(event) => setProtocolNotes(event.target.value)}
                  placeholder="Wyniki przeglądu, uwagi, zalecenia…"
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void patchDetail({
                      protocolData: { ...detail.protocolData, notes: protocolNotes },
                    })
                  }
                >
                  Zapisz protokół
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={() => void handleComplete()}>
                  Podpisz i zakończ
                </Button>
              </div>
              {detail.protocolCompanySignedAt ? (
                <p className="mt-2 text-xs text-emerald-300">
                  Podpisano: {formatDateTime(detail.protocolCompanySignedAt)}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Reakcje</p>
              <div className="flex flex-wrap gap-2">
                {INSPECTION_REACTION_EMOJIS.map((emoji) => {
                  const count = (detail.reactions ?? []).filter((entry) => entry.emoji === emoji).length;
                  const active = (detail.reactions ?? []).some(
                    (entry) =>
                      entry.emoji === emoji &&
                      entry.authorName === (profile ? getUserDisplayName(profile) : ""),
                  );
                  return (
                    <button
                      key={emoji}
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleReaction(emoji)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm",
                        active ? "border-accent bg-accent/15" : "border-border bg-surface-muted/30",
                      )}
                    >
                      {emoji} {count > 0 ? count : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Komentarze</p>
              <div className="grid max-h-48 gap-2 overflow-y-auto">
                {(detail.comments ?? []).length === 0 ? (
                  <p className="text-xs text-muted">Brak komentarzy.</p>
                ) : (
                  (detail.comments ?? []).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/60 p-2 text-sm">
                      <p className="font-medium text-foreground">{entry.authorName}</p>
                      <p className="mt-1 text-muted">{entry.body}</p>
                      <p className="mt-1 text-[10px] text-muted">{formatDateTime(entry.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Textarea
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Dodaj komentarz…"
                />
                <Button type="button" size="sm" disabled={busy || !comment.trim()} onClick={() => void handleCommentSubmit()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
