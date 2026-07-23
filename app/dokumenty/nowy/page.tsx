"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { QuickAddHub } from "@/components/documents/quick-add-hub";

function NewDocumentPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const returnTo = searchParams.get("returnTo");

  return (
    <>
      <PageHeader
        eyebrow="Dokumentacja"
        title="Podręczne dodawanie"
        description="Zdjęcie, dokumentacja, notatka, protokół, hasło, ustalenie lub zmiana — powiązane z klientem i projektem, bez wchodzenia w jego dashboard."
      />
      <QuickAddHub initialClientId={clientId} initialProjectId={projectId} returnTo={returnTo} />
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
