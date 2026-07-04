import { InspectionBoardView } from "@/components/inspections/inspection-board-view";
import { PageHeader } from "@/components/page-header";

export default function InspectionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Serwisy"
        title="Przeglądy"
        description="Cykliczne przeglądy systemów w obiektach komercyjnych — planowanie kwartalne, protokoły serwisowe i tablica Kanban."
      />
      <InspectionBoardView />
    </>
  );
}
