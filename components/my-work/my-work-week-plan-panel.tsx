"use client";

import { useState } from "react";
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
import { fetchWorkRiskAnalysisAi } from "@/lib/supabase/my-work-repository";

export function MyWorkWeekPlanPanel({
  plan,
  canManage,
  teamOptions,
  onAcknowledge,
  onSend,
  onCopyPrevious,
  onCreateDraft,
}: {
  plan: WorkPlanView | null;
  canManage: boolean;
  teamOptions: { id: string; label: string }[];
  onAcknowledge: (comment: string, riskNotes: string) => Promise<void>;
  onSend: (planId: string) => Promise<void>;
  onCopyPrevious: (assignedUserId: string) => Promise<void>;
  onCreateDraft: (assignedUserId: string) => Promise<void>;
}) {
  const [ackOpen, setAckOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(teamOptions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [analyzingRisks, setAnalyzingRisks] = useState(false);

  if (!plan && !canManage) {
    return null;
  }

  const needsAck = plan?.status === "sent";
  const isDraft = plan?.status === "draft";

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
              <p className="mt-1 text-sm text-muted">Brak planu na bieżący tydzień.</p>
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
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedUserId || busy}
                  onClick={() => {
                    setBusy(true);
                    void onCopyPrevious(selectedUserId)
                      .catch((error) =>
                        window.alert(error instanceof Error ? error.message : "Błąd kopiowania planu."),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Kopiuj z poprzedniego tygodnia
                </Button>
                {!plan ? (
                  <Button
                    size="sm"
                    disabled={!selectedUserId || busy}
                    onClick={() => {
                      setBusy(true);
                      void onCreateDraft(selectedUserId)
                        .catch((error) =>
                          window.alert(error instanceof Error ? error.message : "Błąd tworzenia planu."),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    Utwórz szkic
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
      </Card>

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
