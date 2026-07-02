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
        title="Katalog firm wykonawców"
        description="Firmy pogrupowane według branż — ta sama branża może mieć wielu wykonawców. Podpowiadają się przy dodawaniu branży w projekcie klienta."
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
