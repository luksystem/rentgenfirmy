"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProjectInvoiceForm } from "@/components/invoices/project-invoice-form";
import {
  PROJECT_INVOICE_KIND_LABELS,
  type ProjectInvoiceKind,
} from "@/lib/invoices/types";

function isKind(value: string | null): value is ProjectInvoiceKind {
  return value === "invoice" || value === "cost";
}

function NewInvoicePageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const kindParam = searchParams.get("kind");

  const initialKind = useMemo(
    () => (isKind(kindParam) ? kindParam : undefined),
    [kindParam],
  );

  const title =
    initialKind != null
      ? `Nowy wpis: ${PROJECT_INVOICE_KIND_LABELS[initialKind]}`
      : "Nowa faktura / koszt";

  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title={title}
        description="Uzupełnij dane dokumentu, przypisz klienta lub projekt i dołącz skan lub PDF."
      />
      <ProjectInvoiceForm
        initialClientId={clientId}
        initialProjectId={projectId}
        initialKind={initialKind}
      />
    </>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie formularza…</p>}>
      <NewInvoicePageContent />
    </Suspense>
  );
}
