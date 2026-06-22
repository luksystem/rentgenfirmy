"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  FileText,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  UserRound,
} from "lucide-react";
import { ProjectAgreementsPanel } from "@/components/dashboard/project-agreements-panel";
import { ProjectSpecificationPanel } from "@/components/dashboard/project-specification-panel";
import { ClientDashboardOverview } from "@/components/dashboard/client-dashboard-overview";
import { ClientInfoCard } from "@/components/dashboard/client-info-card";
import { ClientProjectSummary } from "@/components/dashboard/client-project-summary";
import { DashboardPublicLinkPanel } from "@/components/dashboard/dashboard-public-link-panel";
import { ProjectContentPanel } from "@/components/dashboard/project-content-panel";
import { ProjectWarrantyPanel } from "@/components/dashboard/project-warranty-panel";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { ProjectDashboardContent } from "@/lib/dashboard/content-types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import { getProcessProgress } from "@/lib/process/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { fetchProjectKanbanPublicLinks } from "@/lib/supabase/kanban-repository";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectAgreementStore } from "@/store/project-agreement-store";

type ClientDashboardTab =
  | "overview"
  | "data"
  | "process"
  | "agreements"
  | "specification"
  | "links";

const EMPTY_AGREEMENTS: ProjectClientAgreement[] = [];

const CLIENT_TAB_CONFIG: Array<{
  id: ClientDashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Przegląd", icon: LayoutDashboard },
  { id: "data", label: "Dane", icon: UserRound },
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
  { id: "overview", label: "Przegląd", icon: LayoutDashboard },
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
  { id: "overview", label: "Przegląd", icon: LayoutDashboard },
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
  pendingAgreementsCount = 0,
  seedKanbanPublicLinks,
  onProjectPatch,
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
  pendingAgreementsCount?: number;
  seedKanbanPublicLinks?: Record<string, string>;
  onProjectPatch?: (projectId: string, patch: Partial<Project>) => void;
}) {
  const [activeTab, setActiveTab] = useState<ClientDashboardTab>("overview");
  const [kanbanPublicLinks, setKanbanPublicLinks] = useState<Record<string, string>>({});

  const storeAgreements = useProjectAgreementStore(
    (state) => state.byProject[selectedProjectId] ?? EMPTY_AGREEMENTS,
  );
  const ensureAgreements = useProjectAgreementStore((state) => state.ensureAgreements);
  const agreementSource = seedAgreements ?? storeAgreements;

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
    if (seedAgreements !== undefined || !enableAgreements || !selectedProjectId) {
      return;
    }
    void ensureAgreements(selectedProjectId);
  }, [enableAgreements, ensureAgreements, seedAgreements, selectedProjectId]);

  const pendingAcceptanceCount = useMemo(() => {
    const computed = agreementSource.filter(
      (entry) =>
        entry.projectId === selectedProjectId && entry.status === "pending_client",
    ).length;
    if (seedAgreements !== undefined && pendingAgreementsCount > computed) {
      return pendingAgreementsCount;
    }
    return computed;
  }, [agreementSource, pendingAgreementsCount, seedAgreements, selectedProjectId]);

  const pendingWarrantyCount = useMemo(() => {
    return agreementSource.filter(
      (entry) =>
        entry.projectId === selectedProjectId &&
        entry.category === "warranty" &&
        entry.status === "pending_client",
    ).length;
  }, [agreementSource, selectedProjectId]);

  const pendingOtherAgreementsCount = pendingAcceptanceCount - pendingWarrantyCount;

  const progress = useMemo(() => {
    if (processProgress !== undefined) {
      return processProgress;
    }
    if (!process || !template) {
      return null;
    }
    return getProcessProgress(template, process);
  }, [process, processProgress, template]);

  const clientVisibleTabs = CLIENT_TAB_CONFIG.filter((tab) => {
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
      <div className="grid gap-4">
        <ClientInfoCard client={client} />
        {renderProjectSwitcher()}
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Dane projektu</h2>
          <ClientProjectSummary project={selectedProject} compact defaultExpanded={!compact} />
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Gwarancja</h2>
          <ProjectWarrantyPanel
            project={selectedProject}
            mode={readOnly ? "client" : "team"}
            authorName={readOnly ? clientAuthorName : teamAuthorName}
            seedAgreements={seedAgreements}
            compact={!compact}
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
        {showPublicLink && clientSpace && !readOnly ? (
          <DashboardPublicLinkPanel space={clientSpace} />
        ) : null}
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
      <div className="rounded-2xl border border-border/80 bg-surface p-4">
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
    if (tabId === "agreements" || tabId === "overview") {
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
    variant: "desktop" | "mobile-bottom",
  ) {
    return (
      <div
        className={cn(
          variant === "desktop"
            ? "mb-4 flex flex-wrap gap-2"
            : "mx-auto grid max-w-lg rounded-2xl border border-border bg-surface-elevated/95 px-1 py-1 shadow-card backdrop-blur-xl",
        )}
        style={
          variant === "mobile-bottom"
            ? { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }
            : undefined
        }
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
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                variant === "desktop"
                  ? cn(
                      "relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "border-accent/50 bg-accent/10 text-foreground"
                        : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                    )
                  : cn(
                      "relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium transition",
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
      case "overview":
        return renderOverviewSection((nextTab) => setActiveTab(nextTab));
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
    <div className="w-full min-w-0 pb-24 xl:pb-0">
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
          <div className="max-xl:hidden">{renderTabBar(clientVisibleTabs, "desktop")}</div>
          <div>
            {activeTab === "data"
              ? renderDataSection(true)
              : renderMainTabContent(activeTab)}
          </div>
        </div>
      ) : (
        <>
          <div className="max-xl:hidden w-full">
            <div className="flex w-full items-start gap-4">
              <aside className="w-[300px] shrink-0 grow-0">{renderDataSection(false)}</aside>
              <main className="min-w-0 w-0 flex-1 grow">
                {renderTabBar(teamMainTabs, "desktop")}
                {renderMainTabContent(activeTab)}
              </main>
            </div>
          </div>
          <div className="xl:hidden">
            {projects.length > 1 && onProjectChange ? (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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
            {activeTab === "data" ? renderDataSection(true) : renderMainTabContent(activeTab)}
          </div>
        </>
      )}

      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 xl:hidden">
        {renderTabBar(readOnly ? clientVisibleTabs : teamMobileTabs, "mobile-bottom")}
      </nav>
    </div>
  );
}
