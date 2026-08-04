"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import { hasFullAppAccess } from "@/lib/auth/types";
import { formatDate } from "@/lib/utils";
import { fetchProjectProcess } from "@/lib/supabase/process-repository";
import {
  approveStageReport,
  fetchStageReports,
  fetchStageReportsPilotEnabled,
  generateStageReport,
  setStageReportsPilotEnabled,
  updateStageReportComment,
} from "@/lib/supabase/stage-report-repository";
import { renderStageReportText } from "@/lib/stage-report/render";
import { STAGE_REPORT_STATUS_LABELS, type StageReport } from "@/lib/stage-report/types";
import type { ProcessTemplate } from "@/lib/process/types";
import { useAuthStore } from "@/store/auth-store";

const STATUS_TONES: Record<StageReport["status"], "waiting" | "blue" | "active"> = {
  wygenerowany: "waiting",
  zatwierdzony: "blue",
  wyslany: "active",
};

type ReadyMilestone = { stageId: string; stageTitle: string; milestoneId: string; milestoneTitle: string };

function findReadyMilestones(
  template: ProcessTemplate,
  completions: Record<string, { completedAt: string } | undefined>,
  existingMilestoneIds: Set<string>,
): ReadyMilestone[] {
  const ready: ReadyMilestone[] = [];
  for (const stage of template.stages) {
    for (const milestone of stage.milestones) {
      if (milestone.items.length === 0) continue;
      if (existingMilestoneIds.has(milestone.id)) continue;
      const allDone = milestone.items.every((item) => completions[item.id]?.completedAt);
      if (allDone) {
        ready.push({
          stageId: stage.id,
          stageTitle: stage.title,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
        });
      }
    }
  }
  return ready;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Copy className="mr-1.5 h-3.5 w-3.5" />
      {copied ? "Skopiowano" : "Kopiuj treść"}
    </Button>
  );
}

type StageReportEmailPreview = { subject: string; html: string; to: string };

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

function ReportRow({ report, onChanged }: { report: StageReport; onChanged: () => void }) {
  const currentProfile = useAuthStore((state) => state.profile);
  const [comment, setComment] = useState(report.coordinatorComment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<StageReportEmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const text = useMemo(() => renderStageReportText(report.content, comment), [report.content, comment]);

  async function saveComment() {
    setBusy(true);
    setError(null);
    try {
      await updateStageReportComment(report.id, comment);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu komentarza.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!currentProfile) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await generateStageReport(
        report.projectId,
        report.content.projectName,
        report.stageId,
        report.milestoneId,
        currentProfile.id,
      );
      setComment(updated.coordinatorComment);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd regeneracji treści.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!currentProfile) return;
    if (comment.trim().length === 0) {
      setError("Komentarz opiekuna jest wymagany do zatwierdzenia.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateStageReportComment(report.id, comment);
      await approveStageReport(report.id, currentProfile.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zatwierdzania.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    setPreviewError(null);
    setPreview(null);
    setNote("");
    setPreviewOpen(true);
    try {
      const data = await postJson<StageReportEmailPreview>(
        `/api/stage-reports/${encodeURIComponent(report.id)}/preview-email`,
      );
      setPreview(data);
    } catch (loadError) {
      setPreviewError(
        loadError instanceof Error ? loadError.message : "Nie udało się przygotować podglądu.",
      );
    }
  }

  function handleNoteChange(nextNote: string) {
    setNote(nextNote);
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    noteDebounceRef.current = setTimeout(() => {
      void postJson<StageReportEmailPreview>(
        `/api/stage-reports/${encodeURIComponent(report.id)}/preview-email`,
        { note: nextNote },
      )
        .then((data) => setPreview(data))
        .catch(() => undefined);
    }, 600);
  }

  async function handleConfirmSend() {
    setSending(true);
    setPreviewError(null);
    try {
      await postJson(`/api/stage-reports/${encodeURIComponent(report.id)}/send-email`, { note });
      setPreviewOpen(false);
      onChanged();
    } catch (sendError) {
      setPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">
              {report.content.stageTitle} — {report.content.milestoneTitle}
            </p>
            <p className="text-xs text-muted">Wygenerowano {formatDate(report.generatedAt)}</p>
          </div>
          <Badge tone={STATUS_TONES[report.status]}>{STAGE_REPORT_STATUS_LABELS[report.status]}</Badge>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Field label="Komentarz opiekuna (2-4 zdania)">
          <Textarea
            value={comment}
            disabled={report.status !== "wygenerowany"}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={text} />
          {report.status === "wygenerowany" ? (
            <>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void handleRegenerate()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Odśwież treść
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void saveComment()}>
                Zapisz komentarz
              </Button>
              <Button type="button" size="sm" disabled={busy} onClick={() => void handleApprove()}>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Zatwierdź
              </Button>
            </>
          ) : null}
          {report.status === "zatwierdzony" ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void handleOpenPreview()}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Wyślij
            </Button>
          ) : null}
          {report.status === "wyslany" ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted">Wysłano {formatDate(report.sentAt!)}</p>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void handleOpenPreview()}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Wyślij ponownie
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>

      <OfferEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        sending={sending}
        error={previewError}
        note={note}
        onNoteChange={handleNoteChange}
        onConfirmSend={() => void handleConfirmSend()}
      />
    </Card>
  );
}

export function StageReportsPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const currentProfile = useAuthStore((state) => state.profile);
  const canManage = currentProfile ? hasFullAppAccess(currentProfile.role) : false;

  const [pilotEnabled, setPilotEnabled] = useState<boolean | null>(null);
  const [reports, setReports] = useState<StageReport[] | null>(null);
  const [readyMilestones, setReadyMilestones] = useState<ReadyMilestone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const enabled = await fetchStageReportsPilotEnabled(projectId);
    setPilotEnabled(enabled);
    if (!enabled) return;

    const [reportRows, process] = await Promise.all([fetchStageReports(projectId), fetchProjectProcess(projectId)]);
    setReports(reportRows);
    if (process?.templateSnapshot) {
      const existingIds = new Set(reportRows.map((r) => r.milestoneId));
      setReadyMilestones(findReadyMilestones(process.templateSnapshot, process.completions ?? {}, existingIds));
    }
  }, [projectId]);

  useEffect(() => {
    void load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Błąd wczytywania."));
  }, [load]);

  async function handleGenerate(milestone: ReadyMilestone) {
    if (!currentProfile) return;
    setGenerating(milestone.milestoneId);
    setError(null);
    try {
      await generateStageReport(projectId, projectName, milestone.stageId, milestone.milestoneId, currentProfile.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd generowania raportu.");
    } finally {
      setGenerating(null);
    }
  }

  async function handleTogglePilot(enabled: boolean) {
    setError(null);
    try {
      await setStageReportsPilotEnabled(projectId, enabled);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu flagi pilotażu.");
    }
  }

  if (pilotEnabled === null) {
    return <p className="text-sm text-muted">Ładowanie…</p>;
  }

  if (!pilotEnabled) {
    return (
      <div className="grid gap-3">
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          Generator raportów etapowych jest w fazie pilotażu — włączony tylko dla wybranych
          projektów. Ten projekt nie ma go dziś aktywnego.
        </p>
        {canManage ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void handleTogglePilot(true)}>
            Włącz pilotaż dla tego projektu
          </Button>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={() => void handleTogglePilot(false)}>
            Wyłącz pilotaż dla tego projektu
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {readyMilestones.length > 0 ? (
        <Card>
          <CardContent className="grid gap-2 py-4">
            <p className="text-sm font-medium text-foreground/90">Gotowe do wygenerowania raportu</p>
            {readyMilestones.map((milestone) => (
              <div
                key={milestone.milestoneId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-muted/10 p-3"
              >
                <span className="text-sm text-foreground">
                  {milestone.stageTitle} — {milestone.milestoneTitle}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={generating === milestone.milestoneId}
                  onClick={() => void handleGenerate(milestone)}
                >
                  Generuj raport
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {reports === null ? (
        <p className="text-sm text-muted">Ładowanie raportów…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted">
          Brak raportów jeszcze — pojawią się tu propozycje po osiągnięciu kamienia milowego.
        </p>
      ) : (
        <div className="grid gap-3">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onChanged={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}
