import Link from "next/link";
import { ServiceIntakeListPanel } from "@/components/service-intake/service-intake-list-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ServiceIntakeAdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Serwis"
        title="Zgłoszenia serwisowe"
        description="Zgłoszenia z publicznego kreatora /zgloszenie — weryfikacja, obsługa i przekształcenie w ofertę."
        action={
          <Button variant="secondary" asChild>
            <Link href="/zgloszenie" target="_blank" rel="noreferrer">
              Podgląd strony publicznej
            </Link>
          </Button>
        }
      />
      <ServiceIntakeListPanel />
    </>
  );
}
