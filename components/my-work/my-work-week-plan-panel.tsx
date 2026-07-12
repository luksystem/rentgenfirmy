"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WORK_PLAN_STATUS_LABELS,
  type WorkPlanView,
} from "@/lib/my-work/plan-types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { fetchWorkRiskAnalysisAi } from "@/lib/supabase/my-work-repository";
import { MyWorkEditWeekPlanDialog } from "@/components/my-work/my-work-edit-week-plan-dialog";
import type { UpdateWeekPlanInput } from "@/lib/my-work/plan-types";
import type { WorkItemView } from "@/lib/my-work/types";
import { buildWeekPlanOptions, currentWeekMonday } from "@/lib/my-work/week-range";

export function MyWorkWeekPlanPanel({
  plan,
  canManage,
  teamOptions,
  onAcknowledge,
  onSend,
  onCopyPrevious,
  onCreateDraft,
  onLoadForUser,
  onOpenItem,
  onUpdatePlan,
  availableTasks = [],
}: {
  plan: WorkPlanView | null;
  canManage: boolean;
  teamOptions: { id: string; label: string }[];
  onAcknowledge: (comment: string, riskNotes: string) => Promise<void>;
  onSend: (planId: string) => Promise<void>;
  onCopyPrevious: (assignedUserId: string, referenceDate: string) => Promise<void>;
  onCreateDraft: (assignedUserId: string, referenceDate: string) => Promise<void>;
  onLoadForUser?: (assignedUserId: string, referenceDate: string) => Promise<void>;
  onOpenItem?: (workItemId: string) => void;
  onUpdatePlan?: (planId: string, input: UpdateWeekPlanInput) => Promise<void>;
  availableTasks?: WorkItemView[];
}) {
  const [ackOpen, setAckOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(teamOptions[0]?.id ?? "");
  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeekMonday());
  const [busy, setBusy] = useState(false);
  const [analyzingRisks, setAnalyzingRisks] = useState(false);
  const weekOptions = useMemo(() => buildWeekPlanOptions(8), []);

  useEffect(() => {
    if (!teamOptions.length) {
      return;
    }
    setSelectedUserId((current) => current || teamOptions[0]!.id);
  }, [teamOptions]);

  useEffect(() => {
    if (!canManage || !onLoadForUser) {
      return;
    }
    const userId = selectedUserId || teamOptions[0]?.id;
    if (!userId) {
      return;
    }
    void onLoadForUser(userId, selectedWeekStart);
  }, [canManage, onLoadForUser, selectedUserId, selectedWeekStart, teamOptions]);

  if (!plan && !canManage) {
    return null;
  }

  const needsAck = plan?.status === "sent";
  const isDraft = plan?.status === "draft";
  const planIsLocked = Boolean(plan && !isDraft);
  const canCreateFromTasks = !plan || isDraft;
  const canCopyPrevious = !plan;

  async function handleAcknowledge() {
    setBusy(true);
    try {
      await onAcknowledge(comment, riskNotes);
      setAckOpen(false);
      setComment("");
      setRiskNotes("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się potwierdzić planu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyzeRisks() {
    setAnalyzingRisks(true);
    try {
      const result = await fetchWorkRiskAnalysisAi();
      setRiskNotes(result.riskNotes);
      if (!comment.trim() && result.recommendations[0]) {
        setComment(result.recommendations[0]!);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się przeanalizować ryzyk.");
    } finally {
      setAnalyzingRisks(false);
    }
  }

  return (
    <>
      <Card className="mb-6 border-border/80 bg-surface-elevated/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <CalendarRange className="h-3.5 w-3.5" />
              Plan tygodnia
            </p>
            {plan ? (
              <>
                <p className="mt-1 text-sm">
                  {formatDate(plan.dateFrom)} – {formatDate(plan.dateTo)}
                  <span className="ml-2 text-muted">({WORK_PLAN_STATUS_LABELS[plan.status]})</span>
                </p>
                {plan.managerComment ? (
                  <p className="mt-1 text-xs text-muted">{plan.managerComment}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">{plan.items.length} pozycji w planie</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">Brak planu na wybrany tydzień.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {needsAck && !canManage ? (
              <Button size="sm" onClick={() => setAckOpen(true)}>
                Potwierdź plan tygodnia
              </Button>
            ) : null}
            {canManage ? (
              <>
                <Field label="Tydzień" className="min-w-[220px]">
                  <Select
                    value={selectedWeekStart}
                    onChange={(event) => setSelectedWeekStart(event.target.value)}
                  >
                    {weekOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {teamOptions.length ? (
                  <Field label="Pracownik" className="min-w-[180px]">
                    <Select
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                    >
                      {teamOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {plan ? (
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                    Edytuj plan
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedUserId || busy || !canCopyPrevious}
                  title={
                    canCopyPrevious
                      ? undefined
                      : "Plan na wybrany tydzień już istnieje — kopiowanie jest niedostępne."
                  }
                  onClick={() => {
                    setBusy(true);
                    void onCopyPrevious(selectedUserId, selectedWeekStart)
                      .catch((error) =>
                        window.alert(error instanceof Error ? error.message : "Błąd kopiowania planu."),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Kopiuj z poprzedniego tygodnia
                </Button>
                {canCreateFromTasks ? (
                  <Button
                    size="sm"
                    disabled={!selectedUserId || busy}
                    onClick={() => {
                      setBusy(true);
                      void onCreateDraft(selectedUserId, selectedWeekStart)
                        .catch((error) =>
                          window.alert(error instanceof Error ? error.message : "Błąd tworzenia planu."),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    {isDraft ? "Odśwież ze zadań" : "Utwórz ze zadań"}
                  </Button>
                ) : null}
                {isDraft && plan ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void onSend(plan.id)
                        .catch((error) =>
                          window.alert(error instanceof Error ? error.message : "Błąd wysyłania planu."),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    Wyślij plan
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {needsAck && !canManage ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Manager wysłał plan — potwierdź zapoznanie lub zgłoś zagrożenia.
          </p>
        ) : null}

        {canManage && planIsLocked ? (
          <p className="mt-3 text-xs text-muted">
            Plan na wybrany tydzień jest {WORK_PLAN_STATUS_LABELS[plan!.status].toLowerCase()}. Użyj{" "}
            <strong>Edytuj plan</strong>, aby zmienić pozycje i wysłać zaktualizowaną wersję.
          </p>
        ) : null}

        {canManage && !plan ? (
          <p className="mt-3 text-xs text-muted">
            Brak planu na wybrany tydzień. Użyj <strong>Utwórz ze zadań</strong> (z aktywnych
            zleceń pracownika) lub <strong>Kopiuj z poprzedniego tygodnia</strong>.
          </p>
        ) : null}

        {plan?.items.length ? (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {plan.items.map((entry) => {
              const workItemId = entry.workItemId;
              const canOpen = Boolean(workItemId && onOpenItem);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => workItemId && onOpenItem?.(workItemId)}
                    className={cn(
                      "w-full rounded-lg border border-border/70 bg-surface px-3 py-2 text-left text-sm transition",
                      canOpen && "hover:border-border-strong hover:bg-surface-muted/40",
                      !canOpen && "cursor-default opacity-60",
                    )}
                  >
                    <span className="font-medium">{entry.workItem?.title ?? "Zadanie"}</span>
                    <span className="ml-2 text-xs text-muted">{formatDate(entry.plannedDate)}</span>
                    {entry.carriedOver ? (
                      <span className="ml-2 text-xs text-amber-700">przeniesione</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>

      {plan && onUpdatePlan ? (
        <MyWorkEditWeekPlanDialog
          plan={plan}
          availableTasks={availableTasks}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={async (input) => {
            await onUpdatePlan(plan.id, input);
          }}
        />
      ) : null}

      <Dialog open={ackOpen} onOpenChange={setAckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdzenie planu tygodnia</DialogTitle>
            <DialogDescription>
              Potwierdź, że zapoznałeś się z planem, lub opisz ryzyka i uwagi.
            </DialogDescription>
          </DialogHeader>
          <Field label="Komentarz">
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
          </Field>
          <Field label="Zagrożenia / ryzyka">
            <Textarea value={riskNotes} onChange={(event) => setRiskNotes(event.target.value)} rows={3} />
          </Field>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={analyzingRisks}
              onClick={() => void handleAnalyzeRisks()}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {analyzingRisks ? "Analizuję…" : "Analiza ryzyk AI"}
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAckOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={() => void handleAcknowledge()} disabled={busy}>
                Potwierdź
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
