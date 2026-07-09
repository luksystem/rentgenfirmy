"use client";

import Link from "next/link";
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResourcePlanList } from "@/components/resource-plan/resource-plan-list";
import { ResourcePlanGantt } from "@/components/resource-plan/resource-plan-gantt";
import { ResourcePlanDashboard } from "@/components/resource-plan/resource-plan-dashboard";
import { ResourcePlanCalendar } from "@/components/resource-plan/resource-plan-calendar";

type ViewMode = "gantt" | "list" | "calendar" | "dashboard";

const VIEW_LABELS: Record<ViewMode, string> = {
  gantt: "Gantt",
  list: "Lista",
  calendar: "Kalendarz",
  dashboard: "Dashboard",
};

export default function ResourcePlanPage() {
  const [view, setView] = useState<ViewMode>("gantt");

  return (
    <>
      <PageHeader
        eyebrow="Plan Zasobów"
        title="Plan Zasobów"
        description="Planowanie pracy zespołów i użytkowników — projekty, etapy procesu, obciążenie, ryzyka i budżety."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-2xl border border-border/70 bg-surface-muted/20 p-1">
              {(["gantt", "list", "calendar", "dashboard"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm font-medium transition",
                    view === mode ? "bg-accent text-accent-foreground shadow-soft" : "text-muted hover:bg-surface-muted",
                  )}
                >
                  {VIEW_LABELS[mode]}
                </button>
              ))}
            </div>
            <Button variant="secondary" asChild>
              <Link href="/ustawienia/plan-zasobow">
                <Settings2 className="mr-1.5 h-4 w-4" />
                Słowniki
              </Link>
            </Button>
          </div>
        }
      />
      {view === "gantt" ? (
        <ResourcePlanGantt />
      ) : view === "list" ? (
        <ResourcePlanList />
      ) : view === "calendar" ? (
        <ResourcePlanCalendar />
      ) : (
        <ResourcePlanDashboard />
      )}
    </>
  );
}
