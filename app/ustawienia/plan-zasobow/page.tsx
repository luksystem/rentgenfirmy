"use client";

import Link from "next/link";
import { DictionarySettingsPage } from "@/components/settings/dictionary-settings-page";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ResourcePlanDictionariesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Plan Zasobów — słowniki"
        description="Role operacyjne, kompetencje, zespoły, obszary, typy pracy, statusy, ryzyka, nieobecności i budżety. Wszystkie pozycje są edytowalne — zmiany są widoczne natychmiast w module Plan Zasobów."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />
      <DictionarySettingsPage />
    </>
  );
}
