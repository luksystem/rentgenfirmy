"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardCheck, GitBranch, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  PROJECT_AGREEMENT_STATUS_LABELS,
  formatAgreementCost,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { formatWarrantyEndDate, getWarrantyStatus } from "@/lib/project/warranty";
import type { Project } from "@/lib/types";

export function ClientDashboardOverview({
  project,
  progress,
  agreements,
  pendingAgreementsCount,
  pendingWarrantyCount,
  onOpenTab,
  readOnly = false,
}: {
  project: Project;
  progress: { percent: number; completed: number; total: number } | null;
  agreements: ProjectClientAgreement[];
  pendingAgreementsCount: number;
  pendingWarrantyCount: number;
  onOpenTab?: (tab: "agreements" | "process" | "data") => void;
  readOnly?: boolean;
}) {
  const warrantyStatus = getWarrantyStatus(project);
  const pendingAgreements = agreements.filter(
    (entry) => entry.status === "pending_client" && entry.category !== "warranty",
  );
  const pendingWarranty = agreements.filter(
    (entry) => entry.status === "pending_client" && entry.category === "warranty",
  );
  const totalPending = pendingAgreementsCount + pendingWarrantyCount;

  return (
    <div className="grid gap-4">
      {totalPending > 0 ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-100">
                {readOnly
                  ? "Masz propozycje do zaakceptowania"
                  : "Oczekuje na akceptację klienta"}
              </p>
              <p className="mt-1 text-sm text-amber-200/90">
                {pendingAgreementsCount > 0 ? `${pendingAgreementsCount} ustaleń` : null}
                {pendingAgreementsCount > 0 && pendingWarrantyCount > 0 ? " · " : null}
                {pendingWarrantyCount > 0
                  ? `${pendingWarrantyCount} propozycji gwarancji`
                  : null}
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
                  {pendingWarrantyCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTab("data")}
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
              <div
                key={entry.id}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
              >
                <p className="font-medium text-foreground">{entry.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {PROJECT_AGREEMENT_CATEGORY_LABELS[entry.category]}
                  {formatAgreementCost(entry) ? ` · ${formatAgreementCost(entry)}` : ""}
                </p>
              </div>
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
              <div
                key={entry.id}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
              >
                <p className="font-medium text-foreground">{entry.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatAgreementCost(entry) ?? "Bez dodatkowego kosztu"}
                </p>
              </div>
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
              onClick={() => onOpenTab("data")}
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
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{entry.title}</p>
                      <p className="text-xs text-muted">
                        {PROJECT_AGREEMENT_STATUS_LABELS[entry.status]}
                      </p>
                    </div>
                  </div>
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
