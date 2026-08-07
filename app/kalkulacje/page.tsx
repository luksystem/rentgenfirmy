import Link from "next/link";
import { CalculatorList } from "@/components/calculator/calculator-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

const moduleInfo = COMMERCIAL_MODULES.salesCalculations;

export default function KalkulacjePage() {
  return (
    <>
      <PageHeader
        eyebrow={moduleInfo.eyebrow}
        title={moduleInfo.label}
        description={moduleInfo.description}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/kalkulacje/ustawienia">Ustawienia</Link>
            </Button>
            <Button asChild>
              <Link href="/kalkulacje/nowy">Nowa kalkulacja</Link>
            </Button>
          </div>
        }
      />
      <CalculatorList />
    </>
  );
}
