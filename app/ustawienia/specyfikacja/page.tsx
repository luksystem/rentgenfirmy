"use client";

import Link from "next/link";
import { SpecificationCatalogSettings } from "@/components/settings/specification-catalog-settings";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function SpecificationCatalogSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Katalog specyfikacji, odbiór wewnętrzny i ankieta klienta"
        description="Pozycje konfiguratora specyfikacji projektu, checklisty QA oraz pytania ankiety funkcjonalności dla klienta."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />
      <SpecificationCatalogSettings />
    </>
  );
}
