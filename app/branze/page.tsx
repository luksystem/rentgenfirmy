import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TradeCatalogView } from "@/components/trades/trade-catalog-view";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function BranzePage() {
  return (
    <>
      <PageHeader
        eyebrow="Projekty"
        title="Katalog branż"
        description="Standardowe branże z mapą lokalizacji wykonawców, protokołami komunikacyjnymi i danymi kontaktowymi — podpowiadają się przy dodawaniu branży w projekcie klienta."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/branze">
              <Settings className="h-4 w-4" />
              Ustawienia katalogu
            </Link>
          </Button>
        }
      />
      <TradeCatalogView />
    </>
  );
}
