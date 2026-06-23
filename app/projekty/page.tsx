"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProjectsViewFiltersFromUrl } from "@/components/projects-view-filters-from-url";
import { ProjectsTable } from "@/components/projects-table";

export default function ProjectsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ProjectsViewFiltersFromUrl />
      </Suspense>
      <PageHeader
        eyebrow="Moduł projektów"
        title="Projekty"
        description="Pełna tabela przepływu: status, etap, priorytet, właściciel następnego kroku, kontakt i blokady."
      />
      <ProjectsTable />
    </>
  );
}
