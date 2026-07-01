"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RequisitionForm } from "@/components/requisitions/requisition-form";
import {
  REQUISITION_CATEGORY_LABELS,
  REQUISITION_CATEGORIES,
  REQUISITION_SCOPE_LABELS,
  REQUISITION_SCOPES,
  type RequisitionCategory,
  type RequisitionScope,
} from "@/lib/requisitions/types";

function isCategory(value: string | null): value is RequisitionCategory {
  return REQUISITION_CATEGORIES.includes(value as RequisitionCategory);
}

function isScope(value: string | null): value is RequisitionScope {
  return REQUISITION_SCOPES.includes(value as RequisitionScope);
}

function NewRequisitionPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const categoryParam = searchParams.get("category");
  const scopeParam = searchParams.get("scope");

  const initialCategory = useMemo(
    () => (isCategory(categoryParam) ? categoryParam : undefined),
    [categoryParam],
  );
  const initialScope = useMemo(
    () => (isScope(scopeParam) ? scopeParam : undefined),
    [scopeParam],
  );

  const title =
    initialCategory != null
      ? `Nowe zapotrzebowanie: ${REQUISITION_CATEGORY_LABELS[initialCategory]}`
      : "Nowe zapotrzebowanie";

  return (
    <>
      <PageHeader
        eyebrow="Operacje"
        title={title}
        description={
          initialScope != null
            ? `Zakres: ${REQUISITION_SCOPE_LABELS[initialScope]}`
            : "Opisz czego potrzebujesz — zgłoszenie trafi do osoby decyzyjnej."
        }
      />
      <RequisitionForm
        initialClientId={clientId}
        initialProjectId={projectId}
        initialCategory={initialCategory}
        initialScope={initialScope}
      />
    </>
  );
}

export default function NewRequisitionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie formularza…</p>}>
      <NewRequisitionPageContent />
    </Suspense>
  );
}
