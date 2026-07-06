"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardCheck, GitBranch, Lock, Shield } from "lucide-react";
import { AgreementSummaryCard } from "@/components/dashboard/agreement-summary-card";
import { Button } from "@/components/ui/button";
import {
  isAgreementBlockingActive,
  isAgreementPendingAttention,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import {
  isChangeRequestBlockingActive,
  isChangeRequestPendingAttention,
  type ProjectChangeRequest,
} from "@/lib/dashboard/change-request-types";
import { formatProjectDuration, formatWarrantyEndDate, getWarrantyStatus } from "@/lib/project/warranty";
import type { Project } from "@/lib/types";

export function ClientDashboardOverview({
  project,
  progress,
  agreements,
  pendingAgreementsCount,
  pendingWarrantyCount,
  changeRequests = [],
  pendingChangeRequestsCount = 0,
  onOpenTab,
  readOnly = false,
}: {
  project: Project;
  progress: { percent: number; completed: number; total: number } | null;
  agreements: ProjectClientAgreement[];
  pendingAgreementsCount: number;
  pendingWarrantyCount: number;
  changeRequests?: ProjectChangeRequest[];
  pendingChangeRequestsCount?: number;
  onOpenTab?: (tab: "agreements" | "changes" | "process" | "home") => void;
  readOnly?: boolean;
}) {
  const warrantyStatus = getWarrantyStatus(project);
  const projectDurationLabel = formatProjectDuration(project);
  const pendingAgreements = agreements.filter(
    (entry) => entry.category !== "warranty" && isAgreementPendingAttention(entry),
  );
  const pendingWarranty = agreements.filter(
    (entry) => entry.category === "warranty" && entry.status === "pending_client",
  );
  const pendingChangeRequests = changeRequests.filter((entry) => isChangeRequestPendingAttention(entry));
  const totalPending = pendingAgreementsCount + pendingWarrantyCount + pendingChangeRequestsCount;
  const pendingDiscussionCount = pendingAgreements.filter(
    (entry) => entry.discussionOpen && entry.status !== "pending_client",
  ).length;
  const pendingAcceptanceOnlyCount = pendingAgreements.length - pendingDiscussionCount;
  const hasBlockingPending =
    pendingAgreements.some((entry) => isAgreementBlockingActive(entry)) ||
    pendingWarranty.some((entry) => isAgreementBlockingActive(entry)) ||
    pendingChangeRequests.some((entry) => isChangeRequestBlockingActive(entry));

  return (
    <div className="grid gap-4">
      {totalPending > 0 ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-amber-100">
                {readOnly
                  ? "Masz propozycje do zaakceptowania"
                  : "Ustalenia wymagające uwagi"}
                {hasBlockingPending ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                    <Lock className="h-3 w-3 shrink-0" />
                    Blokuje etap
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-amber-200/90">
                {[
                  pendingAcceptanceOnlyCount > 0
                    ? `${pendingAcceptanceOnlyCount} ${readOnly ? "do akceptacji" : "oczekujących"}`
                    : null,
                  pendingDiscussionCount > 0
                    ? `${pendingDiscussionCount} w otwartej dyskusji`
                    : null,
                  pendingWarrantyCount > 0
                    ? `${pendingWarrantyCount} propozycji gwarancji`
                    : null,
                  pendingChangeRequestsCount > 0
                    ? `${pendingChangeRequestsCount} ${readOnly ? "zmian projektowych do akceptacji" : "zmian projektowych oczekujących"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {onOpenTab ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingAgreementsCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTab("agreements")}
                    >
                      Przejdź do ustaleń
                    </Button>
                  ) : null}
                  {pendingChangeRequestsCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTab("changes")}
                    >
                      Przejdź do zmian projektowych
                    </Button>
                  ) : null}
                  {pendingWarrantyCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTab("home")}
                    >
                      Przejdź do gwarancji
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {pendingAgreements.length > 0 ? (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <ClipboardCheck className="h-4 w-4 text-accent" />
            Oczekujące ustalenia
          </h3>
          <div className="grid gap-2">
            {pendingAgreements.slice(0, 5).map((entry) => (
              <AgreementSummaryCard
                key={entry.id}
                agreement={entry}
                compact
                className="border-amber-500/30 bg-amber-500/5"
              >
                {entry.body ? (
                  <p className="line-clamp-4 text-sm text-muted">{entry.body}</p>
                ) : null}
              </AgreementSummaryCard>
            ))}
          </div>
        </div>
      ) : null}

      {pendingWarranty.length > 0 ? (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Shield className="h-4 w-4 text-accent" />
            Propozycje przedłużenia gwarancji
          </h3>
          <div className="grid gap-2">
            {pendingWarranty.map((entry) => (
              <AgreementSummaryCard
                key={entry.id}
                agreement={entry}
                compact
                className="border-amber-500/30 bg-amber-500/5"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Proces wdrożenia</p>
          {progress ? (
            <>
              <p className="mt-2 text-2xl font-semibold text-foreground">{progress.percent}%</p>
              <p className="mt-1 text-sm text-muted">
                {progress.completed} / {progress.total} elementów ukończonych
              </p>
              {projectDurationLabel !== "—" ? (
                <p className="mt-1 text-sm text-muted">
                  Czas trwania projektu:{" "}
                  <span className="font-medium text-foreground/90">{projectDurationLabel}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Brak uruchomionego procesu</p>
          )}
          {onOpenTab ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onOpenTab("process")}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Szczegóły procesu
            </Button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gwarancja</p>
          <p className="mt-2 text-sm font-medium text-foreground">{warrantyStatus.label}</p>
          <p className="mt-1 text-sm text-muted">Koniec: {formatWarrantyEndDate(project)}</p>
          {onOpenTab ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onOpenTab("home")}
            >
              <Shield className="mr-2 h-4 w-4" />
              Ustawienia gwarancji
            </Button>
          ) : null}
        </div>
      </div>

      {!readOnly ? (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h3 className="mb-3 text-base font-semibold text-foreground">Ostatnie ustalenia</h3>
          {agreements.filter((entry) => entry.category !== "warranty").length === 0 ? (
            <p className="text-sm text-muted">Brak ustaleń w tym projekcie.</p>
          ) : (
            <div className="grid gap-2">
              {agreements
                .filter((entry) => entry.category !== "warranty")
                .slice(0, 4)
                .map((entry) => (
                  <AgreementSummaryCard key={entry.id} agreement={entry} compact>
                    {entry.body ? (
                      <p className="line-clamp-3 text-sm text-muted">{entry.body}</p>
                    ) : null}
                  </AgreementSummaryCard>
                ))}
            </div>
          )}
          {onOpenTab ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onOpenTab("agreements")}
            >
              Wszystkie ustalenia
            </Button>
          ) : null}
        </div>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projekty/${project.id}/proces`}>
              <GitBranch className="mr-2 h-4 w-4" />
              Otwórz proces (zespół)
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
