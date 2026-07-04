import Link from "next/link";
import { InspectionKanban } from "@/components/inspections/inspection-kanban";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function InspectionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Serwisy"
        title="Przeglądy"
        description="Cykliczne przeglądy systemów w obiektach komercyjnych — planowanie kwartalne, protokoły serwisowe i tablica Kanban."
        action={
          <Button variant="secondary" asChild>
            <Link href="/przeglady/ustawienia">Ustawienia przeglądów</Link>
          </Button>
        }
      />
      <InspectionKanban />
    </>
  );
}
