import { GoalBoardHub } from "@/components/goals/goal-board-hub";
import { PageHeader } from "@/components/page-header";

export default function TabliceCelowPage() {
  return (
    <>
      <PageHeader
        eyebrow="Przestrzenie"
        title="Tablice celów"
        description="Planowanie, monitorowanie i rozliczanie celów firmy, zespołów i pracowników — nie system zarządzania zadaniami."
      />
      <GoalBoardHub />
    </>
  );
}
