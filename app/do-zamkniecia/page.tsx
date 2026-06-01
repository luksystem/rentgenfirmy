"use client";

import { useProjectClickHandlers, useProjectEdit } from "@/components/project-edit-provider";
import { PageHeader } from "@/components/page-header";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { PriorityBadge, ProjectStatusBadge } from "@/components/project-status-badge";
import { Card } from "@/components/ui/card";
import { priorityWeight } from "@/lib/domain";
import { isProjectForClosing } from "@/lib/field-options";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

function ClosingProjectRow({ project }: { project: Project }) {
  const rowClick = useProjectClickHandlers(project, { asTableRow: true });

  return (
    <tr {...rowClick}>
      <td className="px-4 py-3 font-medium">{project.name}</td>
      <td className="px-4 py-3">
        <ProjectStatusBadge
          status={project.flowStatus}
          priority={project.priority}
          isActive={project.isActive}
        />
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={project.priority} />
      </td>
      <td className="px-4 py-3">{project.closeBlocker ?? project.blockerReason ?? "-"}</td>
      <td className="px-4 py-3">{project.remainingHours ?? 0} h</td>
      <td className="px-4 py-3">{project.nextAction ?? "-"}</td>
      <td className="px-4 py-3">{formatDate(project.closeDeadline)}</td>
    </tr>
  );
}

export default function ClosingPage() {
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const { openProjectEdit } = useProjectEdit();
  const closingProjects = projects
    .filter((project) => isProjectForClosing(project, fieldOptions))
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

  return (
    <>
      <PageHeader
        eyebrow="Kontrola domknięć"
        title="Do zamknięcia"
        description="Projekty ze statusem W trakcie na etapie oznaczonym jako do zamknięcia, posortowane najpierw po krytyczności."
      />

      <div className="grid gap-3 md:hidden">
        {closingProjects.map((project) => (
          <MobileListCard
            key={project.id}
            title={project.name}
            onClick={() => openProjectEdit(project)}
            badges={
              <>
                <ProjectStatusBadge
                  status={project.flowStatus}
                  priority={project.priority}
                  isActive={project.isActive}
                />
                <PriorityBadge priority={project.priority} />
              </>
            }
          >
            <MobileField
              label="Blokuje zamknięcie"
              value={project.closeBlocker ?? project.blockerReason ?? "-"}
            />
            <MobileField label="Godziny zostały" value={`${project.remainingHours ?? 0} h`} />
            <MobileField label="Następna akcja" value={project.nextAction ?? "-"} />
            <MobileField label="Termin" value={formatDate(project.closeDeadline)} />
          </MobileListCard>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Projekt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priorytet</th>
                <th className="px-4 py-3">Co blokuje zamknięcie</th>
                <th className="px-4 py-3">Godziny zostały</th>
                <th className="px-4 py-3">Następna akcja</th>
                <th className="px-4 py-3">Termin zamknięcia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {closingProjects.map((project) => (
                <ClosingProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
