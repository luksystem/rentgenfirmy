"use client";

import { PageHeader } from "@/components/page-header";
import { PriorityBadge, ProjectStatusBadge } from "@/components/project-status-badge";
import { Card } from "@/components/ui/card";
import { closingStatuses, priorityWeight } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function ClosingPage() {
  const projects = useAppStore((state) => state.projects);
  const closingProjects = projects
    .filter((project) => closingStatuses.includes(project.flowStatus))
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

  return (
    <>
      <PageHeader
        eyebrow="Kontrola domknięć"
        title="Do zamknięcia"
        description="Projekty w fazie wdrożenia, poprawek albo gotowe do odbioru, posortowane najpierw po krytyczności."
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
            <tbody className="divide-y divide-slate-100">
              {closingProjects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3 font-medium">{project.name}</td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge
                      status={project.flowStatus}
                      priority={project.priority}
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
