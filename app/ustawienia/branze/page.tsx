"use client";

import Link from "next/link";
import { TradeCatalogSettings } from "@/components/settings/trade-catalog-settings";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function TradeCatalogSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Katalog branż"
        description="Standardowe branże projektowe z mapą protokołów komunikacyjnych i domyślnym opisem zakresu."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />
      <TradeCatalogSettings />
    </>
  );
}
