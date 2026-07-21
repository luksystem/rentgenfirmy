import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ServiceIntakeKanban } from "@/components/service-intake/service-intake-kanban";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ServiceBoardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice wdrożeń"
        title="Tablica serwisowa"
        description="Tylko zgłoszenia typu serwisowego (CAFE). Nowa funkcjonalność i prośba o ofertę są w module Szybkie oferty."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tablice-wdrozen">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tablice wdrożeń
            </Link>
          </Button>
        }
      />
      <ServiceIntakeKanban requestTypeFilter="service" />
    </>
  );
}
