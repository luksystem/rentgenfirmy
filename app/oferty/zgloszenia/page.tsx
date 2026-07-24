import Link from "next/link";
import { ServiceIntakeKanban } from "@/components/service-intake/service-intake-kanban";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ServiceIntakeAdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Serwis"
        title="Zgłoszenia serwisowe"
        description="Tylko typ „Zgłoszenie serwisowe” — Kanban CAFE i wątki z klientem. Nowa funkcjonalność i prośba o ofertę trafiają do Szybkich ofert."
        action={
          <Button variant="default" asChild>
            <Link href="/zgloszenie" target="_blank" rel="noreferrer">
              Nowe zgłoszenie klienta
            </Link>
          </Button>
        }
      />
      <ServiceIntakeKanban requestTypeFilter="service" />
    </>
  );
}
