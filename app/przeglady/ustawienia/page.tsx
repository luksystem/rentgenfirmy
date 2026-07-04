import Link from "next/link";
import { InspectionSettingsView } from "@/components/inspections/inspection-settings-view";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function InspectionSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Serwisy"
        title="Ustawienia przeglądów"
        description="Systemy do przeglądu, wzory protokołów serwisowych i parametry planowania."
        action={
          <Button variant="secondary" asChild>
            <Link href="/przeglady">Tablica przeglądów</Link>
          </Button>
        }
      />
      <InspectionSettingsView />
    </>
  );
}
