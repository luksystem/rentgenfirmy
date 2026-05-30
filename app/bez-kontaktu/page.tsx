"use client";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { isWithoutContact } from "@/lib/domain";
import { daysBetween, formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function NoContactPage() {
  const projects = useAppStore((state) => state.projects);
  const staleProjects = projects.filter(isWithoutContact);

  return (
    <>
      <PageHeader
        eyebrow="Otwarte pętle"
        title="Projekty bez kontaktu"
        description="Projekty, w których data kolejnego kontaktu minęła i nie było aktywności dłużej niż 14 dni."
      />

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Projekt</th>
              <th className="px-4 py-3">Właściciel kolejnego kroku</th>
              <th className="px-4 py-3">Data ostatniego kontaktu</th>
              <th className="px-4 py-3">Dni bez aktywności</th>
              <th className="px-4 py-3">Powód blokady</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staleProjects.map((project) => (
              <tr key={project.id}>
                <td className="px-4 py-3 font-medium">{project.name}</td>
                <td className="px-4 py-3">{project.nextStepOwner}</td>
                <td className="px-4 py-3">{formatDate(project.lastContactDate)}</td>
                <td className="px-4 py-3">{daysBetween(project.lastContactDate)}</td>
                <td className="px-4 py-3">{project.blockerReason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
