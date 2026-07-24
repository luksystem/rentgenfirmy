"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { ReportProblemDialog } from "@/components/goals/report-problem-dialog";
import { isAdministratorRole } from "@/lib/auth/types";
import { formatDateTime } from "@/lib/utils";
import { acceptProblem, fetchPendingProblems, rejectProblem } from "@/lib/supabase/goal-problem-repository";
import type { GoalProblem } from "@/lib/goals/types";
import { useAuthStore } from "@/store/auth-store";

function RejectRow({ problem, onDone }: { problem: GoalProblem; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const profile = useAuthStore((state) => state.profile);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
        Odrzuć
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <Field label="Powód odrzucenia">
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
      </Field>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving || !profile}
          onClick={async () => {
            if (!profile) return;
            setSaving(true);
            try {
              await rejectProblem(problem.id, profile.id, reason);
              onDone();
            } finally {
              setSaving(false);
            }
          }}
        >
          Potwierdź odrzucenie
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}

export default function GoalProblemsPage() {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = Boolean(profile && isAdministratorRole(profile.role));
  const [problems, setProblems] = useState<GoalProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setProblems(await fetchPendingProblems());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Nie udało się wczytać zgłoszeń.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAccept(problem: GoalProblem) {
    if (!profile) return;
    setAcceptingId(problem.id);
    try {
      await acceptProblem(problem, profile.id);
      await reload();
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Nie udało się zaakceptować problemu.");
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Problemy do akceptacji"
        description="Zgłoszenia problemów od zespołu — zaakceptowany problem staje się celem PDCA na tablicy Usprawnienia."
        action={<ReportProblemDialog onReported={reload} />}
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">Wczytywanie...</CardContent>
        </Card>
      ) : problems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            Brak zgłoszeń oczekujących na decyzję.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {problems.map((problem) => (
            <Card key={problem.id}>
              <CardContent className="grid gap-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{problem.title}</p>
                    <p className="text-xs text-muted">Zgłoszono: {formatDateTime(problem.createdAt)}</p>
                  </div>
                </div>
                {problem.description ? (
                  <p className="text-sm text-muted">{problem.description}</p>
                ) : null}
                {isAdmin ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={acceptingId === problem.id}
                      onClick={() => void handleAccept(problem)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {acceptingId === problem.id ? "Tworzenie celu..." : "Akceptuj — utwórz cel"}
                    </Button>
                    <RejectRow problem={problem} onDone={reload} />
                  </div>
                ) : (
                  <p className="text-xs text-muted">Decyzję podejmuje administrator/manager.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
