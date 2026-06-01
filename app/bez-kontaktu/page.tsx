"use client";

import { useProjectClickHandlers, useProjectEdit } from "@/components/project-edit-provider";
import { PageHeader } from "@/components/page-header";
import { MobileField, MobileListCard } from "@/components/mobile-list-card";
import { Card } from "@/components/ui/card";
import { isWithoutContact } from "@/lib/domain";
import type { Project } from "@/lib/types";
import { daysBetween, formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

function NoContactProjectRow({ project }: { project: Project }) {
  const rowClick = useProjectClickHandlers(project, { asTableRow: true });

  return (
    <tr {...rowClick}>
      <td className="px-4 py-3 font-medium">{project.name}</td>
      <td className="px-4 py-3">{project.nextStepOwner}</td>
      <td className="px-4 py-3">{formatDate(project.lastContactDate)}</td>
      <td className="px-4 py-3">{daysBetween(project.lastContactDate)}</td>
      <td className="px-4 py-3">{project.blockerReason ?? "-"}</td>
    </tr>
  );
}

export default function NoContactPage() {
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const { openProjectEdit } = useProjectEdit();
  const staleProjects = projects.filter((project) => isWithoutContact(project, fieldOptions));

  return (
    <>
      <PageHeader
        eyebrow="Otwarte pętle"
        title="Projekty bez kontaktu"
        description="Projekty, w których data kolejnego kontaktu minęła i nie było aktywności dłużej niż 14 dni."
      />

      <div className="grid gap-3 md:hidden">
        {staleProjects.map((project) => (
          <MobileListCard
            key={project.id}
            title={project.name}
            onClick={() => openProjectEdit(project)}
          >
            <MobileField label="Właściciel kroku" value={project.nextStepOwner} />
            <MobileField label="Ostatni kontakt" value={formatDate(project.lastContactDate)} />
            <MobileField label="Dni bez aktywności" value={daysBetween(project.lastContactDate)} />
            <MobileField label="Blokada" value={project.blockerReason ?? "-"} />
          </MobileListCard>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Projekt</th>
              <th className="px-4 py-3">Właściciel kolejnego kroku</th>
              <th className="px-4 py-3">Data ostatniego kontaktu</th>
              <th className="px-4 py-3">Dni bez aktywności</th>
              <th className="px-4 py-3">Powód blokady</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staleProjects.map((project) => (
              <NoContactProjectRow key={project.id} project={project} />
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
