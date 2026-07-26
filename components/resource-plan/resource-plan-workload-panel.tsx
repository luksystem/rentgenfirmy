"use client";

import { useMemo } from "react";
import type { UserProfile } from "@/lib/auth/types";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import type { UserResourceProfile } from "@/lib/resource-plan/user-resource-types";
import {
  computeResourcePlanWorkloadPanel,
  formatWorkloadDayLabel,
  type ResourcePlanGroupUtilizationRow,
  type ResourcePlanPersonUtilizationRow,
} from "@/lib/resource-plan/workload-panel";
import { BarPanel } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function UtilizationBar({
  label,
  sublabel,
  personDays,
  capacityPersonDays,
  utilizationPercent,
  color,
}: {
  label: string;
  sublabel?: string;
  personDays: number;
  capacityPersonDays: number;
  utilizationPercent: number | null;
  color?: string | null;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {label} {sublabel ? <span className="text-muted">({sublabel})</span> : null}
        </span>
        <span className="text-muted">
          {personDays.toFixed(1)} / {capacityPersonDays.toFixed(1)} os-dn
          {utilizationPercent != null ? ` · ${utilizationPercent.toFixed(0)}%` : ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted/40">
        <div
          className={cn("h-full rounded-full", (utilizationPercent ?? 0) > 100 ? "bg-rose-500" : "bg-accent")}
          style={{ width: `${Math.min(100, utilizationPercent ?? 0)}%`, backgroundColor: color ?? undefined }}
        />
      </div>
    </div>
  );
}

function GroupUtilizationCard({
  title,
  rows,
  unassignedPersonDays,
  unassignedLabel,
  emptyLabel,
}: {
  title: string;
  rows: ResourcePlanGroupUtilizationRow[];
  unassignedPersonDays: number;
  unassignedLabel: string;
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.length === 0 && unassignedPersonDays === 0 ? (
          <p className="text-sm text-muted">{emptyLabel}</p>
        ) : (
          <>
            {rows.map((row) => (
              <UtilizationBar
                key={row.groupId}
                label={row.groupName}
                sublabel={`${row.memberCount} os.`}
                personDays={row.personDays}
                capacityPersonDays={row.capacityPersonDays}
                utilizationPercent={row.utilizationPercent}
                color={row.color}
              />
            ))}
            {unassignedPersonDays > 0 ? (
              <p className="text-xs text-muted">
                {unassignedLabel}: {unassignedPersonDays.toFixed(1)} os-dn
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PersonUtilizationCard({ rows }: { rows: ResourcePlanPersonUtilizationRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Obłożenie per osoba</CardTitle>
      </CardHeader>
      <CardContent className="grid max-h-64 gap-2 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Brak zaangażowanych osób w tym okresie.</p>
        ) : (
          rows.map((row) => (
            <UtilizationBar
              key={row.userId}
              label={row.name}
              personDays={row.personDays}
              capacityPersonDays={row.capacityPersonDays}
              utilizationPercent={row.utilizationPercent}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ResourcePlanWorkloadPanel({
  items,
  from,
  to,
  teamProfiles,
  resourceProfilesById,
  teamOptions,
  roleOptions,
}: {
  items: ResourcePlanItem[];
  from: string;
  to: string;
  teamProfiles: UserProfile[];
  resourceProfilesById: Record<string, UserResourceProfile>;
  teamOptions: DictionaryItem[];
  roleOptions: DictionaryItem[];
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
        roleOptions,
      }),
    [items, from, to, teamProfiles, resourceProfilesById, teamOptions, roleOptions],
  );

  const dailyChartData = data.dailyLoad.map((row) => ({
    name: formatWorkloadDayLabel(row.date),
    value: row.personDays,
  }));

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BarPanel title={`Obłożenie dzienne (osobodniówki) — razem ${data.totalPersonDays.toFixed(1)}`} data={dailyChartData} />

        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie dzienne</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface text-muted">
                <tr className="text-left">
                  <th className="pb-1 font-medium">Dzień</th>
                  <th className="pb-1 font-medium">Osobodniówki</th>
                  <th className="pb-1 font-medium">Dostępne</th>
                  <th className="pb-1 font-medium">Wykorzystanie</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyLoad.map((row) => (
                  <tr key={row.dateIso} className="border-t border-border/40">
                    <td className="py-1 text-foreground">{formatWorkloadDayLabel(row.date)}</td>
                    <td className="py-1">{row.personDays.toFixed(1)}</td>
                    <td className="py-1">{row.capacityPersonDays.toFixed(1)}</td>
                    <td className={cn("py-1", (row.utilizationPercent ?? 0) > 100 ? "text-rose-400" : "text-muted")}>
                      {row.utilizationPercent != null ? `${row.utilizationPercent.toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GroupUtilizationCard
          title="Wykorzystanie zespołów"
          rows={data.teamUtilization}
          unassignedPersonDays={data.unassignedTeamPersonDays}
          unassignedLabel="Bez przypisania do zespołu"
          emptyLabel="Brak danych o zespołach w tym okresie."
        />
        <GroupUtilizationCard
          title="Wykorzystanie ról (instalator / programista / …)"
          rows={data.roleUtilization}
          unassignedPersonDays={data.unassignedRolePersonDays}
          unassignedLabel="Bez przypisanej roli"
          emptyLabel="Brak danych o rolach w tym okresie."
        />
        <PersonUtilizationCard rows={data.personUtilization} />
      </div>
    </div>
  );
}
