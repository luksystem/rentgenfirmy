"use client";

import type { ComponentType } from "react";
import { HomeQuickStatus } from "@/components/home/home-quick-status";
import { ReportDomainWidget } from "@/components/home/widgets/report-domain-widget";
import { ProjectMetricsWidget } from "@/components/home/widgets/project-metrics-widget";
import { CriticalProjectsWidget } from "@/components/home/widgets/critical-projects-widget";
import { MyTasksWidget } from "@/components/home/widgets/my-tasks-widget";
import { MyKanbanWidget } from "@/components/home/widgets/my-kanban-widget";
import { MyTimeWidget } from "@/components/home/widgets/my-time-widget";
import { MyAvailabilityWidget } from "@/components/home/widgets/my-availability-widget";
import { MyXpWidget } from "@/components/home/widgets/my-xp-widget";
import { MyReviewWidget } from "@/components/home/widgets/my-review-widget";

const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  "quick-status": HomeQuickStatus,
  budget: () => <ReportDomainWidget domain="budget" />,
  sales: () => <ReportDomainWidget domain="sales" />,
  "project-metrics": ProjectMetricsWidget,
  "critical-projects": CriticalProjectsWidget,
  deployment: () => <ReportDomainWidget domain="deployment" />,
  team: () => <ReportDomainWidget domain="team" />,
  "my-tasks": MyTasksWidget,
  "my-kanban": MyKanbanWidget,
  "my-time": MyTimeWidget,
  "my-availability": MyAvailabilityWidget,
  "my-xp": MyXpWidget,
  "my-review": MyReviewWidget,
};

/** Widżety, które same zajmują pełną szerokość wiersza (mają już wewnętrzny grid/karty). */
const FULL_WIDTH_WIDGETS = new Set(["quick-status", "project-metrics", "critical-projects"]);

/** Renderuje widżety w kolejności wybranej przez usera (patrz Ustawienia konta). */
export function HomeWidgetGrid({ widgetIds }: { widgetIds: string[] }) {
  const validIds = widgetIds.filter((id) => WIDGET_COMPONENTS[id]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {validIds.map((id) => {
        const Widget = WIDGET_COMPONENTS[id];
        return (
          <div key={id} className={FULL_WIDTH_WIDGETS.has(id) ? "md:col-span-2" : undefined}>
            <Widget />
          </div>
        );
      })}
    </div>
  );
}
