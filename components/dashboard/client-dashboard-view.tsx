"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ClipboardCheck,
  FileText,
  FolderOpen,
  GitBranch,
  Home,
  LayoutGrid,
  Link2,
  UserRound,
} from "lucide-react";
import { ProjectAgreementsPanel } from "@/components/dashboard/project-agreements-panel";
import { ProjectSpecificationPanel } from "@/components/dashboard/project-specification-panel";
import { ClientDashboardHome } from "@/components/dashboard/client-dashboard-home";
import { ClientDashboardOverview } from "@/components/dashboard/client-dashboard-overview";
import { ClientInfoCard } from "@/components/dashboard/client-info-card";
import { ClientProjectSummary } from "@/components/dashboard/client-project-summary";
import { ProjectContentPanel } from "@/components/dashboard/project-content-panel";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { PublicKanbanEmbedded } from "@/components/process/public-kanban-embedded";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { isAgreementPendingAttention } from "@/lib/dashboard/agreement-types";
import type { ProjectDashboardContent } from "@/lib/dashboard/content-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import { getProcessProgress } from "@/lib/process/types";
import { extractKanbanTokenFromPublicPath } from "@/lib/process/kanban-public-path";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { fetchProjectKanbanPublicLinks } from "@/lib/supabase/kanban-repository";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectAgreementsRealtime } from "@/hooks/use-project-agreements-realtime";
import { useProjectAgreementStore } from "@/store/project-agreement-store";

type ClientDashboardTab =
  | "home"
  | "overview"
  | "data"
  | "process"
  | "agreements"
  | "specification"
  | "links";

const EMPTY_AGREEMENTS: ProjectClientAgreement[] = [];

const PUBLIC_CLIENT_TAB_CONFIG: Array<{
  id: ClientDashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "home", label: "HOME", icon: Home },
  { id: "process", label: "Proces", icon: GitBranch },
  { id: "agreements", label: "Ustalenia", icon: ClipboardCheck },
  { id: "specification", label: "Specyfikacja", icon: FileText },
  { id: "links", label: "Linki", icon: Link2 },
];

const TEAM_MAIN_TAB_CONFIG: Array<{
  id: ClientDashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "home", label: "HOME", icon: Home },
  { id: "process", label: "Proces", icon: GitBranch },
  { id: "agreements", label: "Ustalenia", icon: ClipboardCheck },
  { id: "specification", label: "Specyfikacja", icon: FileText },
  { id: "links", label: "Linki", icon: Link2 },
];

const TEAM_MOBILE_TAB_CONFIG: Array<{
  id: ClientDashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "home", label: "HOME", icon: Home },
  { id: "data", label: "Dane", icon: UserRound },
  { id: "process", label: "Proces", icon: GitBranch },
  { id: "agreements", label: "Ustalenia", icon: ClipboardCheck },
  { id: "specification", label: "Spec.", icon: FileText },
  { id: "links", label: "Linki", icon: Link2 },
];

export function ClientDashboardView({
  client,
  projects,
  selectedProjectId,
  onProjectChange,
  clientSpace,
  process = null,
  template = null,
  showPublicLink = true,
  readOnly = false,
  clientAuthorName = "Klient",
  teamAuthorName = "Zespół",
  enableAgreements = true,
  enableSpecification = true,
  enableContent = true,
  processProgress,
  seedAgreements,
  seedSpecificationItems,
  seedContent,
  seedKanbanPublicLinks,
  onProjectPatch,
  onAgreementsUpdated,
  activeKanbanToken = null,
  onKanbanTokenChange,
}: {
  client: Client;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange?: (projectId: string) => void;
  clientSpace: DashboardSpace | null;
  process?: ProjectProcess | null;
  template?: ProcessTemplate | null;
  showPublicLink?: boolean;
  readOnly?: boolean;
  clientAuthorName?: string;
  teamAuthorName?: string;
  enableAgreements?: boolean;
  enableSpecification?: boolean;
  enableContent?: boolean;
  processProgress?: { percent: number; completed: number; total: number } | null;
  seedAgreements?: ProjectClientAgreement[];
  seedSpecificationItems?: ProjectSpecificationItem[];
  seedContent?: ProjectDashboardContent[];
  seedKanbanPublicLinks?: Record<string, string>;
  onProjectPatch?: (projectId: string, patch: Partial<Project>) => void;
  /** Wywoływane po odświeżeniu ustaleń (realtime / fetch) — np. publiczny dashboard klienta. */
  onAgreementsUpdated?: (agreements: ProjectClientAgreement[]) => void;
  /** Osadzona tablica Kanban w publicznym dashboardzie (token z ?kanban=). */
  activeKanbanToken?: string | null;
  onKanbanTokenChange?: (token: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<ClientDashboardTab>("home");
  const [kanbanPublicLinks, setKanbanPublicLinks] = useState<Record<string, string>>({});

  const handleSelectTab = useCallback(
    (tab: ClientDashboardTab) => {
      if (activeKanbanToken) {
        onKanbanTokenChange?.(null);
      }
      setActiveTab(tab);
    },
    [activeKanbanToken, onKanbanTokenChange],
  );

  const handleKanbanNavigate = useCallback(
    (kanbanHref: string) => {
      const kanbanToken = extractKanbanTokenFromPublicPath(kanbanHref);
      if (!kanbanToken) {
        return;
      }
      setActiveTab("process");
      onKanbanTokenChange?.(kanbanToken);
    },
    [onKanbanTokenChange],
  );

  useEffect(() => {
    if (activeKanbanToken) {
      setActiveTab("process");
    }
  }, [activeKanbanToken]);

  const storeAgreements = useProjectAgreementStore(
    (state) => state.byProject[selectedProjectId] ?? EMPTY_AGREEMENTS,
  );
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const seedProjectAgreements = useProjectAgreementStore((state) => state.seedProjectAgreements);
  const agreementSource =
    storeAgreements.length > 0 ? storeAgreements : (seedAgreements ?? storeAgreements);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  useEffect(() => {
    if (seedKanbanPublicLinks !== undefined) {
      setKanbanPublicLinks(seedKanbanPublicLinks);
      return;
    }

    if (!selectedProjectId) {
      setKanbanPublicLinks({});
      return;
    }

    let cancelled = false;
    void fetchProjectKanbanPublicLinks(selectedProjectId)
      .then((links) => {
        if (!cancelled) {
          setKanbanPublicLinks(links);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setKanbanPublicLinks({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seedKanbanPublicLinks, selectedProjectId]);

  useEffect(() => {
    if (!enableAgreements || !selectedProjectId || seedAgreements === undefined) {
      return;
    }
    seedProjectAgreements(selectedProjectId, seedAgreements);
  }, [enableAgreements, seedAgreements, seedProjectAgreements, selectedProjectId]);

  useEffect(() => {
    if (!enableAgreements || !selectedProjectId || readOnly) {
      return;
    }
    void ensureAgreements(selectedProjectId);
  }, [enableAgreements, ensureAgreements, readOnly, selectedProjectId]);

  const refreshAgreementsFromServer = useCallback(() => {
    if (!enableAgreements || !selectedProjectId) {
      return;
    }
    void ensureAgreements(selectedProjectId, { force: true });
  }, [enableAgreements, ensureAgreements, selectedProjectId]);

  useProjectAgreementsRealtime(
    enableAgreements && !readOnly ? selectedProjectId : undefined,
    refreshAgreementsFromServer,
  );

  useEffect(() => {
    if (!onAgreementsUpdated || storeAgreements.length === 0) {
      return;
    }
    onAgreementsUpdated(storeAgreements);
  }, [onAgreementsUpdated, storeAgreements]);

  const pendingAcceptanceCount = useMemo(() => {
    return agreementSource.filter(
      (entry) =>
        entry.projectId === selectedProjectId && isAgreementPendingAttention(entry),
    ).length;
  }, [agreementSource, selectedProjectId]);

  const pendingWarrantyCount = useMemo(() => {
    return agreementSource.filter(
      (entry) =>
        entry.projectId === selectedProjectId &&
        entry.category === "warranty" &&
        entry.status === "pending_client",
    ).length;
  }, [agreementSource, selectedProjectId]);

  const pendingOtherAgreementsCount = useMemo(() => {
    return agreementSource.filter(
      (entry) =>
        entry.projectId === selectedProjectId &&
        entry.category !== "warranty" &&
        isAgreementPendingAttention(entry),
    ).length;
  }, [agreementSource, selectedProjectId]);

  const progress = useMemo(() => {
    if (processProgress !== undefined) {
      return processProgress;
    }
    if (!process || !template) {
      return null;
    }
    return getProcessProgress(template, process);
  }, [process, processProgress, template]);

  const publicClientTabs = PUBLIC_CLIENT_TAB_CONFIG.filter((tab) => {
    if (tab.id === "agreements" && !enableAgreements) return false;
    if (tab.id === "specification" && !enableSpecification) return false;
    return true;
  });

  const teamMainTabs = TEAM_MAIN_TAB_CONFIG.filter((tab) => {
    if (tab.id === "agreements" && !enableAgreements) return false;
    if (tab.id === "specification" && !enableSpecification) return false;
    return true;
  });

  const teamMobileTabs = TEAM_MOBILE_TAB_CONFIG.filter((tab) => {
    if (tab.id === "agreements" && !enableAgreements) return false;
    if (tab.id === "specification" && !enableSpecification) return false;
    return true;
  });

  if (!selectedProject) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Ten klient nie ma przypisanych projektów. Przypisz projekt w module Projektów.
        </CardContent>
      </Card>
    );
  }

  function renderProjectSwitcher(className?: string) {
    if (projects.length <= 1 || !onProjectChange) {
      return null;
    }

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projekty klienta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => onProjectChange(project.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition",
                project.id === selectedProjectId
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border/70 bg-surface-muted/20 text-muted hover:border-accent/30 hover:text-foreground",
              )}
            >
              <p className="font-medium">{project.name}</p>
              <p className="text-xs text-muted">
                {project.type} · {project.stage}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }

  function renderDataSection(compact = false) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClientInfoCard client={client} />
        {renderProjectSwitcher()}
        <div className="min-w-0 rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Dane projektu</h2>
          <ClientProjectSummary
            project={selectedProject}
            compact
            defaultExpanded={!compact}
            excludeWarrantyFields
          />
        </div>
      </div>
    );
  }

  function renderProcessSection() {
    return (
      <div className="grid min-w-0 gap-4">
        {progress ? (
          <div className="rounded-2xl border border-border/80 bg-surface p-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted">Postęp procesu wdrożenia</span>
              <span className="font-medium text-foreground">{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {progress.completed} / {progress.total} elementów ukończonych
            </p>
          </div>
        ) : null}

        {template && process ? (
          <div className="min-w-0 max-w-full rounded-2xl border border-border/80 bg-surface p-4">
            <h2 className="mb-4 text-base font-semibold text-foreground">Proces wdrożenia</h2>
            <ProcessPipeline
              template={template}
              process={process}
              interactive={false}
              stacked
              kanbanPublicLinks={kanbanPublicLinks}
              onKanbanNavigate={
                readOnly && onKanbanTokenChange ? handleKanbanNavigate : undefined
              }
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            Proces wdrożenia nie został jeszcze uruchomiony dla tego projektu.
          </p>
        )}

        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projekty/${selectedProject.id}/proces`}>
                <GitBranch className="mr-2 h-4 w-4" />
                Otwórz proces (zespół)
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tablice-wdrozen/${client.id}`}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Tablice Kanban
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderLinksSection() {
    if (!enableContent) {
      return <p className="text-sm text-muted">Moduł linków będzie dostępny po aktualizacji bazy danych.</p>;
    }

    return (
      <div className="grid min-w-0 gap-4">
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Link2 className="h-4 w-4 text-accent" />
            Linki zewnętrzne
          </h2>
          <ProjectContentPanel
            projectId={selectedProject.id}
            section="links"
            readOnly={readOnly}
            seedItems={seedContent}
            collapsible={false}
          />
        </div>
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <FolderOpen className="h-4 w-4 text-accent" />
            Pliki i zdjęcia
          </h2>
          <ProjectContentPanel
            projectId={selectedProject.id}
            section="files"
            readOnly={readOnly}
            seedItems={seedContent}
            collapsible
          />
        </div>
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Instrukcje</h2>
          <ProjectContentPanel
            projectId={selectedProject.id}
            section="instructions"
            readOnly={readOnly}
            seedItems={seedContent}
            collapsible
          />
        </div>
      </div>
    );
  }

  function renderHomeSection() {
    return (
      <div className="min-w-0 max-w-full">
        <ClientDashboardHome
        client={client}
        project={selectedProject}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
        progress={progress}
        agreements={agreementSource}
        pendingAgreementsCount={pendingOtherAgreementsCount}
        pendingWarrantyCount={pendingWarrantyCount}
        onOpenTab={(tab) => handleSelectTab(tab)}
        clientSpace={clientSpace}
        showPublicLinkPanel={showPublicLink && !readOnly}
        readOnly={readOnly}
        authorName={readOnly ? clientAuthorName : teamAuthorName}
        seedAgreements={seedAgreements}
        onWarrantySettingsSave={
          readOnly
            ? undefined
            : async (settings) => {
                await onProjectPatch?.(selectedProject.id, {
                  systemHandoverAt: settings.systemHandoverAt ?? undefined,
                  warrantyDurationMonths: settings.warrantyDurationMonths ?? undefined,
                });
              }
        }
        onWarrantyExtensionAccepted={(warrantyEndsAt) =>
          onProjectPatch?.(selectedProject.id, { warrantyEndsAt })
        }
      />
      </div>
    );
  }

  function renderOverviewSection(onOpenTab?: (tab: ClientDashboardTab) => void) {
    return (
      <ClientDashboardOverview
        project={selectedProject}
        progress={progress}
        agreements={agreementSource}
        pendingAgreementsCount={pendingOtherAgreementsCount}
        pendingWarrantyCount={pendingWarrantyCount}
        readOnly={readOnly}
        onOpenTab={
          onOpenTab
            ? (tab) => onOpenTab(tab)
            : undefined
        }
      />
    );
  }

  function renderAgreementsPanel() {
    return (
      <div className="min-w-0 rounded-2xl border border-border/80 bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">Ustalenia i akceptacje</h2>
        <ProjectAgreementsPanel
          projectId={selectedProject.id}
          mode={readOnly ? "client" : "team"}
          authorName={readOnly ? clientAuthorName : teamAuthorName}
          seedAgreements={seedAgreements}
          onWarrantyExtensionAccepted={(warrantyEndsAt) =>
            onProjectPatch?.(selectedProject.id, { warrantyEndsAt })
          }
        />
      </div>
    );
  }

  function renderSpecificationPanel() {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">Konfigurator specyfikacji</h2>
        <ProjectSpecificationPanel
          projectId={selectedProject.id}
          readOnly={readOnly}
          seedItems={seedSpecificationItems}
        />
      </div>
    );
  }

  function tabBadgeCount(tabId: ClientDashboardTab) {
    if (tabId === "agreements") {
      return pendingAcceptanceCount;
    }
    return 0;
  }

  function renderTabBar(
    tabs: Array<{
      id: ClientDashboardTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
    }>,
    variant: "desktop" | "mobile-top" | "mobile-bottom",
  ) {
    if (variant === "mobile-top") {
      return (
        <div className="mb-4 w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full gap-2 pr-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badgeCount = tabBadgeCount(tab.id);
            const showBadge = badgeCount > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                )}
              >
                <span className="relative inline-flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {showBadge ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          variant === "desktop"
            ? "mb-4 flex flex-wrap gap-2"
            : "mx-auto flex max-w-lg gap-0.5 overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface-elevated/95 px-1 py-1 shadow-card backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const badgeCount = tabBadgeCount(tab.id);
          const showBadge = badgeCount > 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={cn(
                variant === "desktop"
                  ? cn(
                      "relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "border-accent/50 bg-accent/10 text-foreground"
                        : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                    )
                  : cn(
                      "relative flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                      active ? "text-accent" : "text-muted",
                    ),
              )}
            >
              <span className="relative inline-flex items-center gap-1.5">
                <Icon className={variant === "desktop" ? "h-4 w-4" : "h-5 w-5"} />
                {variant === "desktop" ? tab.label : null}
                {showBadge ? (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full bg-rose-500 font-bold text-white",
                      variant === "desktop"
                        ? "h-4 min-w-4 px-1 text-[9px]"
                        : "absolute -right-1.5 -top-1 h-4 min-w-4 px-1 text-[9px]",
                    )}
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </span>
              {variant === "mobile-bottom" ? tab.label : null}
            </button>
          );
        })}
      </div>
    );
  }

  function renderMainTabContent(tab: ClientDashboardTab) {
    switch (tab) {
      case "home":
        return renderHomeSection();
      case "overview":
        return renderOverviewSection((nextTab) => handleSelectTab(nextTab));
      case "process":
        return renderProcessSection();
      case "agreements":
        return enableAgreements ? renderAgreementsPanel() : null;
      case "specification":
        return enableSpecification ? renderSpecificationPanel() : null;
      case "links":
        return renderLinksSection();
      default:
        return null;
    }
  }

  return (
    <div className={cn("w-full min-w-0", readOnly ? "pb-24 xl:pb-0" : "xl:pb-0")}>
      {readOnly ? (
        <div className="w-full">
          {projects.length > 1 && onProjectChange ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onProjectChange(project.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    project.id === selectedProjectId
                      ? "border-accent/50 bg-accent/10 text-foreground"
                      : "border-border/70 text-muted",
                  )}
                >
                  {project.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="max-xl:hidden">{renderTabBar(publicClientTabs, "desktop")}</div>
          <div className="min-w-0 max-w-full">
            {activeKanbanToken ? (
              <PublicKanbanEmbedded
                token={activeKanbanToken}
                defaultAuthorName={clientAuthorName}
                onBack={() => onKanbanTokenChange?.(null)}
              />
            ) : (
              renderMainTabContent(activeTab)
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden w-full min-w-0 xl:block">
            {renderTabBar(teamMainTabs, "desktop")}
            <div className="mt-4 grid w-full gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="min-w-0 max-w-full self-start overflow-x-hidden">
                {renderDataSection(false)}
              </aside>
              <section className="min-w-0 overflow-x-hidden">{renderMainTabContent(activeTab)}</section>
            </div>
          </div>
          <div className="min-w-0 max-w-full xl:hidden">
            {renderTabBar(teamMobileTabs, "mobile-top")}
            {projects.length > 1 && onProjectChange ? (
              <div className="mb-4 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onProjectChange(project.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      project.id === selectedProjectId
                        ? "border-accent/50 bg-accent/10 text-foreground"
                        : "border-border/70 text-muted",
                    )}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="min-w-0 max-w-full">
              {activeTab === "data" ? renderDataSection(true) : renderMainTabContent(activeTab)}
            </div>
          </div>
        </>
      )}

      {readOnly ? (
        <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 xl:hidden">
          {renderTabBar(publicClientTabs, "mobile-bottom")}
        </nav>
      ) : null}
    </div>
  );
}
