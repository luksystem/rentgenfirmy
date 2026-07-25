"use client";

import { useMemo } from "react";
import type { UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import { computeResourcePlanWorkloadPanel, formatWorkloadDayLabel } from "@/lib/resource-plan/workload-panel";
import { BarPanel } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ResourcePlanWorkloadPanel({
  items,
  from,
  to,
  teamProfiles,
  resourceProfilesById,
  teamOptions,
}: {
  items: ResourcePlanItem[];
  from: string;
  to: string;
  teamProfiles: UserProfile[];
  resourceProfilesById: Record<string, UserResourceProfile>;
  teamOptions: DictionaryItem[];
}) {
  const data = useMemo(
    () =>
      computeResourcePlanWorkloadPanel({
        items,
        from,
        to,
        teamProfiles,
        resourceProfilesById,
        teamOptions,
      }),
    [items, from, to, teamProfiles, resourceProfilesById, teamOptions],
  );

  const dailyChartData = data.dailyLoad.map((row) => ({
    name: formatWorkloadDayLabel(row.date),
    value: row.personDays,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BarPanel title={`Obłożenie dzienne (osobodniówki) — razem ${data.totalPersonDays.toFixed(1)}`} data={dailyChartData} />

      <Card>
        <CardHeader>
          <CardTitle>Wykorzystanie zespołów w tym okresie</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {data.teamUtilization.length === 0 && data.unassignedTeamPersonDays === 0 ? (
            <p className="text-sm text-muted">Brak danych o zespołach w tym okresie.</p>
          ) : (
            <>
              {data.teamUtilization.map((row) => (
                <div key={row.teamId} className="grid gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {row.teamName} <span className="text-muted">({row.memberCount} os.)</span>
                    </span>
                    <span className="text-muted">
                      {row.personDays.toFixed(1)} / {row.capacityPersonDays.toFixed(1)} os-dn
                      {row.utilizationPercent != null ? ` · ${row.utilizationPercent.toFixed(0)}%` : ""}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted/40">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        (row.utilizationPercent ?? 0) > 100 ? "bg-rose-500" : "bg-accent",
                      )}
                      style={{
                        width: `${Math.min(100, row.utilizationPercent ?? 0)}%`,
                        backgroundColor: row.color ?? undefined,
                      }}
                    />
                  </div>
                </div>
              ))}
              {data.unassignedTeamPersonDays > 0 ? (
                <p className="text-xs text-muted">
                  Bez przypisania do zespołu: {data.unassignedTeamPersonDays.toFixed(1)} os-dn
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
