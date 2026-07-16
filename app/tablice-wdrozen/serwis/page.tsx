import { ServiceIntakeKanban } from "@/components/service-intake/service-intake-kanban";
import { PageHeader } from "@/components/page-header";

export default function ServiceBoardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice wdrożeń"
        title="Tablica serwisowa"
        description="Tylko zgłoszenia typu serwisowego (CAFE). Nowa funkcjonalność i prośba o ofertę są w module Szybkie oferty."
      />
      <ServiceIntakeKanban requestTypeFilter="service" />
    </>
  );
}
