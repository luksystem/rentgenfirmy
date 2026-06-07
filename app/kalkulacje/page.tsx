import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

const moduleInfo = COMMERCIAL_MODULES.salesCalculations;

export default function SalesCalculationsPage() {
  return (
    <>
      <PageHeader
        eyebrow={moduleInfo.eyebrow}
        title={moduleInfo.label}
        description={moduleInfo.description}
        action={
          <Button variant="secondary" asChild>
            <Link href={COMMERCIAL_MODULES.serviceSettlement.href}>
              Przejdź do rozliczeń serwis
            </Link>
          </Button>
        }
      />

      <Card className="border-dashed border-border/80">
        <CardContent className="grid gap-3 py-8 text-center sm:py-10">
          <p className="text-sm font-medium text-foreground">Moduł w przygotowaniu</p>
          <p className="mx-auto max-w-xl text-sm text-muted">
            Tutaj powstanie osobny flow do budowania interaktywnych wycen Smart Home dla
            klientów — niezależny od szybkiego rozliczania serwisowego.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
