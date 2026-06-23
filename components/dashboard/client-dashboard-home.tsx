"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  GitBranch,
  LayoutGrid,
  Shield,
  Star,
  Wrench,
} from "lucide-react";
import { AgreementCollapsibleShell } from "@/components/dashboard/agreement-collapsible-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientInfoCard } from "@/components/dashboard/client-info-card";
import { ClientProjectSummary } from "@/components/dashboard/client-project-summary";
import { DashboardPublicLinkPanel } from "@/components/dashboard/dashboard-public-link-panel";
import { ProjectWarrantyPanel } from "@/components/dashboard/project-warranty-panel";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  buildAgreementCollapsibleMeta,
  formatAgreementCost,
  getAgreementStatusLabel,
  isAgreementPendingAttention,
  type ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import {
  formatWarrantyEndDate,
  getWarrantyStatus,
  hasPendingWarrantyExtension,
} from "@/lib/project/warranty";
import type { Client } from "@/lib/service/types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import type { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const SERVICE_REQUEST_URL = "https://www.serwis.luksystem.pl";

const warrantyToneClass: Record<ReturnType<typeof getWarrantyStatus>["tone"], string> = {
  neutral: "border-border/80 bg-surface-muted/40 text-muted",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

const warrantyCardToneClass: Record<ReturnType<typeof getWarrantyStatus>["tone"], string> = {
  neutral: "border-border/80 bg-surface-muted/20",
  warning: "border-amber-500/35 bg-amber-500/8",
  success: "border-emerald-500/35 bg-emerald-500/8",
  danger: "border-rose-500/35 bg-rose-500/8",
};

function ProcessProgressCard({
  progress,
  onOpenProcess,
}: {
  progress: { percent: number; completed: number; total: number };
  onOpenProcess?: () => void;
}) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress.percent / 100) * circumference;

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/12 via-surface to-surface p-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 104 104" aria-hidden>
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-surface-muted/80"
              strokeWidth="8"
            />
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-accent transition-all duration-500"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground">{progress.percent}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <GitBranch className="h-3.5 w-3.5 text-accent" />
            Proces wdrożenia
          </p>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold">{progress.completed}</span>
            <span className="text-muted"> / {progress.total} elementów ukończonych</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {onOpenProcess ? (
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onOpenProcess}>
              Pełny proces
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WarrantyHomeCard({
  project,
  agreements,
  mode,
  authorName,
  seedAgreements,
  onWarrantySettingsSave,
  onWarrantyExtensionAccepted,
}: {
  project: Project;
  agreements: ProjectClientAgreement[];
  mode: "team" | "client";
  authorName: string;
  seedAgreements?: ProjectClientAgreement[];
  onWarrantySettingsSave?: (settings: {
    systemHandoverAt: string | null;
    warrantyDurationMonths: number | null;
  }) => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const warrantyStatus = getWarrantyStatus(project, {
    hasPendingExtension: hasPendingWarrantyExtension(agreements),
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition",
        warrantyCardToneClass[warrantyStatus.tone],
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            warrantyToneClass[warrantyStatus.tone],
          )}
        >
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gwarancja</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                warrantyToneClass[warrantyStatus.tone],
              )}
            >
              {warrantyStatus.label}
            </span>
            <span className="min-w-0 break-words text-sm text-muted">
              Koniec: {formatWarrantyEndDate(project)}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition", expanded && "rotate-180")}
        />
      </button>
      {expanded ? (
        <div className="border-t border-border/50 px-4 py-4">
          <ProjectWarrantyPanel
            project={project}
            mode={mode}
            authorName={authorName}
            seedAgreements={seedAgreements}
            embedded
            onWarrantySettingsSave={onWarrantySettingsSave}
            onWarrantyExtensionAccepted={onWarrantyExtensionAccepted}
          />
        </div>
      ) : null}
    </div>
  );
}

function ServiceRequestDialog({
  open,
  onOpenChange,
  project,
  agreements,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  agreements: ProjectClientAgreement[];
}) {
  const warrantyStatus = getWarrantyStatus(project, {
    hasPendingExtension: hasPendingWarrantyExtension(agreements),
  });
  const endDate = formatWarrantyEndDate(project);

  const statusMessage = (() => {
    switch (warrantyStatus.status) {
      case "active":
        return `Gwarancja jest aktywna do ${endDate}. Przed zgłoszeniem serwisowym warto mieć pod ręką opis usterki i zdjęcia instalacji.`;
      case "expiring_soon":
        return `${warrantyStatus.label} (koniec: ${endDate}). Możesz zgłosić usterkę przed wygaśnięciem gwarancji.`;
      case "expired":
        return `Gwarancja wygasła ${endDate !== "—" ? `(${endDate})` : ""}. Zgłoszenie może podlegać rozliczeniu poza gwarancją.`;
      case "pending_extension":
        return "Oczekuje na akceptację przedłużenia gwarancji. Aktualny status może ulec zmianie po zatwierdzeniu propozycji.";
      default:
        return "Brak aktywnej gwarancji na tym projekcie. Zgłoszenie serwisowe może podlegać standardowemu rozliczeniu.";
    }
  })();

  function handleContinue() {
    window.open(SERVICE_REQUEST_URL, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zgłoszenie serwisowe</DialogTitle>
          <DialogDescription>
            Przed przejściem do formularza zewnętrznego sprawdź status gwarancji projektu.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "rounded-xl border p-4",
            warrantyCardToneClass[warrantyStatus.tone],
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                warrantyToneClass[warrantyStatus.tone],
              )}
            >
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status gwarancji</p>
              <p className="mt-1 text-base font-semibold text-foreground">{warrantyStatus.label}</p>
              <p className="mt-1 text-sm text-muted">Koniec gwarancji: {endDate}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{statusMessage}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleContinue}>
            Przejdź do zgłoszenia
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PublicHomeQuickActions({
  kanbanPublicHref,
  onOpenKanban,
  onServiceRequest,
  onOpenSatisfaction,
}: {
  kanbanPublicHref?: string | null;
  onOpenKanban?: (href: string) => void;
  onServiceRequest: () => void;
  onOpenSatisfaction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-surface to-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Szybkie akcje</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {kanbanPublicHref && onOpenKanban ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 justify-start gap-2 px-4 py-3 text-left"
            onClick={() => onOpenKanban(kanbanPublicHref)}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-accent" />
            <span>
              <span className="block font-medium">Tablica wdrożeń</span>
              <span className="block text-xs font-normal text-muted">Zgłoszenia i postęp prac</span>
            </span>
          </Button>
        ) : null}
        {onOpenSatisfaction ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 justify-start gap-2 px-4 py-3 text-left"
            onClick={onOpenSatisfaction}
          >
            <Star className="h-4 w-4 shrink-0 text-accent" />
            <span>
              <span className="block font-medium">Ocena ustaleń</span>
              <span className="block text-xs font-normal text-muted">Weryfikacja przy przekazaniu</span>
            </span>
          </Button>
        ) : null}
        <Button
          type="button"
          className={cn(
            "h-auto min-h-11 justify-start gap-2 px-4 py-3 text-left",
            kanbanPublicHref && onOpenKanban && onOpenSatisfaction ? "" : "sm:col-span-2",
          )}
          onClick={onServiceRequest}
        >
          <Wrench className="h-4 w-4 shrink-0" />
          <span>
            <span className="block font-semibold uppercase tracking-wide">Zgłoszenie serwisowe</span>
            <span className="block text-xs font-normal text-primary-foreground/80">
              Formularz na serwis.luksystem.pl
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}

export function ClientDashboardHome({
  client,
  project,
  projects,
  selectedProjectId,
  onProjectChange,
  progress,
  agreements,
  pendingAgreementsCount,
  pendingWarrantyCount,
  onOpenTab,
  clientSpace = null,
  showPublicLinkPanel = false,
  readOnly = false,
  authorName = "Zespół",
  seedAgreements,
  onWarrantySettingsSave,
  onWarrantyExtensionAccepted,
  kanbanPublicHref,
  onOpenKanban,
  enableSatisfactionReview = true,
}: {
  client: Client;
  project: Project;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange?: (projectId: string) => void;
  progress: { percent: number; completed: number; total: number } | null;
  agreements: ProjectClientAgreement[];
  pendingAgreementsCount: number;
  pendingWarrantyCount: number;
  onOpenTab?: (tab: "agreements" | "process" | "home" | "satisfaction") => void;
  clientSpace?: DashboardSpace | null;
  /** Panel włączania linku publicznego dashboardu — tylko widok zespołu. */
  showPublicLinkPanel?: boolean;
  readOnly?: boolean;
  authorName?: string;
  seedAgreements?: ProjectClientAgreement[];
  onWarrantySettingsSave?: (settings: {
    systemHandoverAt: string | null;
    warrantyDurationMonths: number | null;
  }) => void | Promise<void>;
  onWarrantyExtensionAccepted?: (warrantyEndsAt: string) => void | Promise<void>;
  kanbanPublicHref?: string | null;
  onOpenKanban?: (href: string) => void;
  enableSatisfactionReview?: boolean;
}) {
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const pendingAgreements = agreements.filter(
    (entry) => entry.category !== "warranty" && isAgreementPendingAttention(entry),
  );
  const pendingWarranty = agreements.filter(
    (entry) => entry.category === "warranty" && entry.status === "pending_client",
  );
  const totalPending = pendingAgreementsCount + pendingWarrantyCount;
  const pendingDiscussionCount = pendingAgreements.filter(
    (entry) => entry.discussionOpen && entry.status !== "pending_client",
  ).length;
  const pendingAcceptanceOnlyCount = pendingAgreements.length - pendingDiscussionCount;

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      {readOnly ? (
        <>
          <PublicHomeQuickActions
            kanbanPublicHref={kanbanPublicHref}
            onOpenKanban={onOpenKanban}
            onServiceRequest={() => setServiceDialogOpen(true)}
            onOpenSatisfaction={
              enableSatisfactionReview && onOpenTab
                ? () => onOpenTab("satisfaction")
                : undefined
            }
          />
          <ServiceRequestDialog
            open={serviceDialogOpen}
            onOpenChange={setServiceDialogOpen}
            project={project}
            agreements={agreements}
          />
        </>
      ) : null}

      {totalPending > 0 ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-100">
                {readOnly
                  ? "Masz propozycje do zaakceptowania"
                  : "Ustalenia wymagające uwagi"}
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
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {onOpenTab && pendingAgreementsCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => onOpenTab("agreements")}
                >
                  Przejdź do ustaleń
                </Button>
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
            {pendingAgreements.slice(0, 5).map((entry) => {
              const meta = buildAgreementCollapsibleMeta(entry);
              return (
                <AgreementCollapsibleShell
                  key={entry.id}
                  compact
                  className="border-amber-500/30 bg-amber-500/5"
                  title={meta.title}
                  subtitle={meta.subtitle}
                  statusLabel={meta.statusLabel}
                  statusTone={meta.statusTone}
                  hint={meta.hint}
                >
                  {entry.body ? (
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted">{entry.body}</p>
                  ) : null}
                </AgreementCollapsibleShell>
              );
            })}
          </div>
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

      {pendingWarranty.length > 0 ? (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Shield className="h-4 w-4 text-accent" />
            Propozycje przedłużenia gwarancji
          </h3>
          <div className="grid gap-2">
            {pendingWarranty.map((entry) => {
              const meta = buildAgreementCollapsibleMeta(entry);
              return (
                <AgreementCollapsibleShell
                  key={entry.id}
                  compact
                  className="border-amber-500/30 bg-amber-500/5"
                  title={meta.title}
                  subtitle={meta.subtitle}
                  statusLabel={meta.statusLabel}
                  statusTone={meta.statusTone}
                  hint={meta.hint}
                >
                  {entry.proposedWarrantyEndDate ? (
                    <p className="text-sm text-muted">
                      Proponowana data gwarancji: {formatDate(entry.proposedWarrantyEndDate)}
                    </p>
                  ) : null}
                </AgreementCollapsibleShell>
              );
            })}
          </div>
          {onOpenTab ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onOpenTab("agreements")}
            >
              Akceptuj w ustaniach
            </Button>
          ) : null}
        </div>
      ) : null}

      {showPublicLinkPanel && clientSpace ? (
        <div className="min-w-0 max-w-full">
          <DashboardPublicLinkPanel space={clientSpace} />
        </div>
      ) : showPublicLinkPanel && !clientSpace ? (
        <div className="min-w-0 rounded-2xl border border-border/80 bg-surface-muted/20 p-4 text-sm text-muted">
          Link publiczny będzie dostępny po utworzeniu przestrzeni dashboardu dla tego projektu.
        </div>
      ) : null}

      <ClientInfoCard client={client} />

      {projects.length > 1 && onProjectChange ? (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Projekty</h2>
          <div className="grid gap-2">
            {projects.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onProjectChange(entry.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-sm transition",
                  entry.id === selectedProjectId
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 bg-surface-muted/20 text-muted hover:border-accent/30 hover:text-foreground",
                )}
              >
                <p className="font-medium">{entry.name}</p>
                <p className="text-xs text-muted">
                  {entry.type} · {entry.stage}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-w-0 max-w-full rounded-2xl border border-border/80 bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">Dane projektu</h2>
        <ClientProjectSummary project={project} compact excludeWarrantyFields />
      </div>

      <WarrantyHomeCard
        project={project}
        agreements={agreements}
        mode={readOnly ? "client" : "team"}
        authorName={authorName}
        seedAgreements={seedAgreements}
        onWarrantySettingsSave={onWarrantySettingsSave}
        onWarrantyExtensionAccepted={onWarrantyExtensionAccepted}
      />

      {progress ? (
        <ProcessProgressCard
          progress={progress}
          onOpenProcess={onOpenTab ? () => onOpenTab("process") : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <GitBranch className="h-3.5 w-3.5 text-accent" />
            Proces wdrożenia
          </p>
          <p className="mt-2 text-sm text-muted">Proces nie został jeszcze uruchomiony.</p>
        </div>
      )}
    </div>
  );
}
