"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProjectDocumentForm } from "@/components/documents/project-document-form";
import {
  PROJECT_DOCUMENT_CATEGORY_LABELS,
  PROJECT_DOCUMENT_CATEGORIES,
  type ProjectDocumentCategory,
} from "@/lib/documents/types";

function isCategory(value: string | null): value is ProjectDocumentCategory {
  return PROJECT_DOCUMENT_CATEGORIES.includes(value as ProjectDocumentCategory);
}

function NewDocumentPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const categoryParam = searchParams.get("category");

  const initialCategory = useMemo(
    () => (isCategory(categoryParam) ? categoryParam : undefined),
    [categoryParam],
  );

  const title =
    initialCategory != null
      ? `Nowy dokument: ${PROJECT_DOCUMENT_CATEGORY_LABELS[initialCategory]}`
      : "Nowy dokument";

  return (
    <>
      <PageHeader
        eyebrow="Dokumentacja"
        title={title}
        description="Dołącz zdjęcie, skan lub PDF i przypisz do klienta lub projektu."
      />
      <ProjectDocumentForm
        initialClientId={clientId}
        initialProjectId={projectId}
        initialCategory={initialCategory}
      />
    </>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie formularza…</p>}>
      <NewDocumentPageContent />
    </Suspense>
  );
}
