"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectChangeRequestsPanel } from "@/components/dashboard/project-change-requests-panel";
import { ProjectAgreementsPanel } from "@/components/dashboard/project-agreements-panel";
import { ServiceForm } from "@/components/service/service-form";
import { getUserDisplayName } from "@/lib/auth/types";
import { ROT_SOURCE_LABELS, type RotItem } from "@/lib/rot/types";
import { useAuthStore } from "@/store/auth-store";
import { useServiceStore } from "@/store/service-store";

/**
 * D33 — nawigacja z pozycji ROT do konkretnego elementu, nie do projektu. Reużywa istniejące
 * panele projektowe zamiast budować nowe edytory: `focusChangeRequestId`/`focusAgreementId`
 * (już istniały, dotąd używane tylko z widoku klienta) rozwijają właściwą pozycję w liście;
 * `ServiceForm` jest już samodzielny (tylko `initialService`), więc dla ofert osadzamy go wprost.
 *
 * Kanban: świadomie NIE osadzone — `KanbanTaskDetailModal` wymaga ~20 propsów (kolumny, komentarze,
 * reakcje, załączniki, przypisania) dostarczanych dziś tylko przez tablicę-hosta. Fallback: link do
 * otwarcia projektu, jak dotąd — pełne osadzenie to osobna pozycja, nie doklejona tutaj na siłę.
 */
export function RotItemDetailPanel({
  item,
  onClose,
  onOpenProject,
  onNavigate,
  hasPrev,
  hasNext,
}: {
  item: RotItem | null;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const profile = useAuthStore((state) => state.profile);
  const authorName = profile ? getUserDisplayName(profile) : "Zespół";
  const service = useServiceStore((state) =>
    item?.sourceType === "szybka_oferta" ? state.getServiceById(item.sourceId) : undefined,
  );

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullscreen>
        {item ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral" className="text-[10px]">
                    {ROT_SOURCE_LABELS[item.sourceType]}
                  </Badge>
                  <Badge
                    tone={item.stageTitle || item.inferredStageTitle ? "neutral" : "waiting"}
                    className={`text-[10px] ${!item.stageTitle && item.inferredStageTitle ? "opacity-70" : ""}`}
                  >
                    {item.stageTitle ?? item.inferredStageTitle ?? "Bez przypisania"}
                    {!item.stageTitle && item.inferredStageTitle ? " (wywnioskowany)" : ""}
                  </Badge>
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {item.projectName}
                  </span>
                </div>
                {item.moveCount != null && item.moveCount > 0 ? (
                  <p className="text-xs text-amber-300">
                    Pochodzi z etapu {item.originStageTitle ?? "nieznanego"}, przeniesiona {item.moveCount}×,
                    czeka na: {item.carryOverReason ?? "—"}.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenProject(item.projectId)}
                  title="Otwórz pełny projekt"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("prev")}
                  disabled={!hasPrev}
                  title="Poprzednia pozycja"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("next")}
                  disabled={!hasNext}
                  title="Następna pozycja"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onClose} title="Zamknij">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {item.sourceType === "zmiana_projektowa" ? (
                <ProjectChangeRequestsPanel
                  projectId={item.projectId}
                  mode="team"
                  authorName={authorName}
                  focusChangeRequestId={item.sourceId}
                />
              ) : item.sourceType === "ustalenie" ? (
                <ProjectAgreementsPanel
                  projectId={item.projectId}
                  mode="team"
                  authorName={authorName}
                  focusAgreementId={item.sourceId}
                />
              ) : item.sourceType === "szybka_oferta" ? (
                service ? (
                  <ServiceForm initialService={service} />
                ) : (
                  <p className="text-sm text-muted">Nie znaleziono oferty.</p>
                )
              ) : (
                <div className="grid gap-3 text-sm text-muted">
                  <p>
                    Pełny podgląd karty kanban w tym panelu jeszcze nie działa — otwórz projekt, żeby
                    zobaczyć kartę „{item.title}”.
                  </p>
                  <Button type="button" variant="outline" onClick={() => onOpenProject(item.projectId)}>
                    Otwórz projekt
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
