"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ResourcePlanList } from "@/components/resource-plan/resource-plan-list";

export default function ResourcePlanPage() {
  return (
    <>
      <PageHeader
        eyebrow="Plan Zasobów"
        title="Plan Zasobów"
        description="Planowanie pracy zespołów i użytkowników — projekty, etapy procesu, obciążenie, ryzyka i budżety. Widok listy (MVP) — Gantt, kalendarz i dashboard w kolejnych etapach."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/plan-zasobow">
              <Settings2 className="mr-1.5 h-4 w-4" />
              Słowniki
            </Link>
          </Button>
        }
      />
      <ResourcePlanList />
    </>
  );
}
