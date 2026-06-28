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
        title="Katalog specyfikacji i odbiór wewnętrzny"
        description="Pozycje konfiguratora specyfikacji projektu oraz checklisty QA przypisane do każdej z nich."
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
