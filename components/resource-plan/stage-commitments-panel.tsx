"use client";

// Krok A A5/A6 (docs/08 D27 2.4) — "znaczniki terminu" w planie zasobów: overlay obliczeniowy nad
// project_process_items (elementy z lead_days), OSOBNY od resource_plan_items — żaden wiersz w
// bazie nie powstaje, dopóki ktoś świadomie nie zaplanuje/oznaczy ukończone. Zaimplementowane jako
// osobna zakładka planu zasobów (nie jako nowy tor w istniejącym, złożonym Gantcie — mniejsze
// ryzyko regresji istniejącej mechaniki przeciągania, ta sama treść funkcjonalna).
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectEdit } from "@/components/project-edit-provider";
import { MilestoneDateBadge } from "@/components/process/milestone-date-badge";
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  STAGE_COMMITMENT_STATUS_LABELS,
  type StageCommitment,
  type StageCommitmentStatus,
} from "@/lib/stage-commitments/types";
import {
  fetchStageCommitments,
  setStageCommitmentCompleted,
  setStageCommitmentPlannedDate,
} from "@/lib/supabase/stage-commitments-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDate } from "@/lib/utils";

const STATUS_TONES: Record<StageCommitmentStatus, "closed" | "waiting" | "critical" | "neutral"> = {
  zrobione: "closed",
  ok: "waiting",
  rozbieznosc: "critical",
  brak_planu: "neutral",
};

function CommitmentRow({
  commitment,
  canEdit,
  onOpenProject,
  onSavePlannedDate,
  onToggleDone,
}: {
  commitment: StageCommitment;
  canEdit: boolean;
  onOpenProject: (projectId: string) => void;
  onSavePlannedDate: (commitment: StageCommitment, date: string | null) => Promise<void>;
  onToggleDone: (commitment: StageCommitment) => Promise<void>;
}) {
  const done = Boolean(commitment.dataUkonczenia);
  const overdue =
    !done && !!commitment.terminWynikajacy && commitment.terminWynikajacy < new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => void onToggleDone(commitment)}
              className="shrink-0 text-muted hover:text-accent"
              aria-label={done ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
          ) : done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-muted" />
          )}
          <button
            type="button"
            onClick={() => onOpenProject(commitment.projectId)}
            className="min-w-0 truncate text-sm font-medium text-foreground hover:underline"
          >
            {commitment.projectName}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" className="text-[10px]">
            {commitment.stageTitle}
          </Badge>
          <Badge tone={STATUS_TONES[commitment.status]} className="text-[10px]">
            {STAGE_COMMITMENT_STATUS_LABELS[commitment.status]}
          </Badge>
          {overdue ? (
            <Badge tone="critical" className="text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              Po terminie
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-foreground/90">{commitment.title}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Termin wynikający: {commitment.terminWynikajacy ? formatDate(commitment.terminWynikajacy) : "—"}
        </span>
        {canEdit ? (
          <MilestoneDateBadge
            date={commitment.dataPlanowana}
            editable
            onSave={(date) => onSavePlannedDate(commitment, date)}
            title="Kliknij, aby ustawić datę planowaną"
            emptyLabel="Zaplanuj"
            ariaLabel="Data planowana"
          />
        ) : (
          <MilestoneDateBadge date={commitment.dataPlanowana} />
        )}
        <span
          className={cn(
            "flex items-center gap-1",
            commitment.responsibleName ? "" : "italic text-rose-300",
          )}
        >
          {commitment.responsibleName
            ? `${commitment.responsibleName}${commitment.responsibleSource === "macierz" ? " (z macierzy ról)" : ""}`
            : "Brak widocznego odpowiedzialnego"}
        </span>
      </div>
    </div>
  );
}

export function StageCommitmentsPanel({ horizonDays = 21 }: { horizonDays?: number }) {
  const [commitments, setCommitments] = useState<StageCommitment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useAppStore((state) => state.projects);
  const { openProjectEdit } = useProjectEdit();
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const staffAccess = profile ? hasFullAppAccess(profile.role) : false;

  useEffect(() => {
    let cancelled = false;
    void fetchStageCommitments(horizonDays)
      .then((rows) => {
        if (!cancelled) setCommitments(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nie udało się wczytać zobowiązań etapu.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [horizonDays]);

  function handleOpenProject(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (project) openProjectEdit(project);
  }

  function canEditCommitment(commitment: StageCommitment) {
    // Krok A 2.4 (docs/08 D27) — odpowiedzialny + koordynator operacyjny. Personel z pełnym
    // dostępem obejmuje koordynatora operacyjnego; odpowiedzialny edytuje własną pozycję.
    return staffAccess || (profile ? profile.id === commitment.responsibleUserId : false);
  }

  async function handleSavePlannedDate(commitment: StageCommitment, date: string | null) {
    await setStageCommitmentPlannedDate(commitment.itemId, date);
    setCommitments((current) =>
      (current ?? []).map((row) => (row.itemId === commitment.itemId ? { ...row, dataPlanowana: date } : row)),
    );
  }

  async function handleToggleDone(commitment: StageCommitment) {
    const nextDone = !commitment.dataUkonczenia;
    await setStageCommitmentCompleted(commitment.projectId, commitment.templateItemId, nextDone, displayName ?? undefined);
    setCommitments((current) =>
      (current ?? []).map((row) =>
        row.itemId === commitment.itemId
          ? { ...row, dataUkonczenia: nextDone ? new Date().toISOString() : null, status: nextDone ? "zrobione" : row.status }
          : row,
      ),
    );
  }

  const grouped = useMemo(() => {
    const rows = commitments ?? [];
    return {
      rozbieznosc: rows.filter((r) => r.status === "rozbieznosc"),
      brak_planu: rows.filter((r) => r.status === "brak_planu"),
      ok: rows.filter((r) => r.status === "ok"),
      zrobione: rows.filter((r) => r.status === "zrobione"),
    };
  }, [commitments]);

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }

  if (commitments === null) {
    return <p className="text-sm text-muted">Ładowanie…</p>;
  }

  const sections: { key: StageCommitmentStatus; label: string; rows: StageCommitment[] }[] = [
    { key: "rozbieznosc", label: "Rozbieżność z terminem", rows: grouped.rozbieznosc },
    { key: "brak_planu", label: "Brak planu", rows: grouped.brak_planu },
    { key: "ok", label: "Zaplanowane", rows: grouped.ok },
    { key: "zrobione", label: "Zrobione", rows: grouped.zrobione },
  ];

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Elementy procesu z wyliczonym terminem (aktywny etap każdego projektu), w oknie najbliższych{" "}
        {horizonDays} dni — plus wszystko, co już zrobione. Znacznik terminu, nie blok w Gantcie —
        nic tu nie zajmuje czasu w obciążeniu, dopóki nie trafi do planu.
      </p>
      {sections.map((section) => (
        <Card key={section.key}>
          <CardContent className="grid gap-2 py-5">
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONES[section.key]}>{section.label}</Badge>
              <span className="text-xs text-muted">{section.rows.length}</span>
            </div>
            {section.rows.length === 0 ? (
              <p className="text-sm text-muted">Brak pozycji.</p>
            ) : (
              <div className="grid gap-2">
                {section.rows.map((commitment) => (
                  <CommitmentRow
                    key={commitment.itemId}
                    commitment={commitment}
                    canEdit={canEditCommitment(commitment)}
                    onOpenProject={handleOpenProject}
                    onSavePlannedDate={handleSavePlannedDate}
                    onToggleDone={handleToggleDone}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
