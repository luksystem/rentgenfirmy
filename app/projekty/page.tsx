"use client";

import { PageHeader } from "@/components/page-header";
import { ProjectsTable } from "@/components/projects-table";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Moduł projektów"
        title="Projekty"
        description="Pełna tabela przepływu: status, etap, priorytet, właściciel następnego kroku, kontakt i blokady."
      />
      <ProjectsTable />
    </>
  );
}
