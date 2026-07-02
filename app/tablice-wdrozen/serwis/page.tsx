import { ServiceIntakeKanban } from "@/components/service-intake/service-intake-kanban";
import { PageHeader } from "@/components/page-header";

export default function ServiceBoardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice wdrożeń"
        title="Tablica serwisowa"
        description="Kanban zgłoszeń serwisowych z priorytetami CAFE, terminami reakcji i wątkami publicznymi."
      />
      <ServiceIntakeKanban />
    </>
  );
}
