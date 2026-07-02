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
        description="Zgłoszenia z publicznego kreatora /zgloszenie — tablica Kanban, priorytety CAFE i wątki z klientem."
        action={
          <Button variant="secondary" asChild>
            <Link href="/zgloszenie" target="_blank" rel="noreferrer">
              Podgląd strony publicznej
            </Link>
          </Button>
        }
      />
      <ServiceIntakeKanban />
    </>
  );
}
