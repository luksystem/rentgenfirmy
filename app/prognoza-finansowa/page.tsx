"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BudgetForecastDashboard } from "@/components/budget-forecast/budget-forecast-dashboard";
import { BudgetCostItemsManager } from "@/components/budget-forecast/budget-cost-items-manager";
import { BudgetPipelineOverview } from "@/components/budget-forecast/budget-pipeline-overview";

type BudgetForecastTab = "prognoza" | "koszty" | "pipeline";

const TAB_LABELS: Record<BudgetForecastTab, string> = {
  prognoza: "Prognoza",
  koszty: "Koszty stałe",
  pipeline: "Pipeline",
};

const TAB_DESCRIPTIONS: Record<BudgetForecastTab, string> = {
  prognoza:
    "Prognoza płynności firmy na najbliższe miesiące — rzeczywiste wpłaty i harmonogramy połączone ze spodziewanymi wpływami z projektów, ważone pewnością. Suwaki po prawej przeliczają wynik na żywo.",
  koszty: "Koszty stałe, cykliczne i jednorazowe firmy — wejście do prognozy płynności.",
  pipeline: "Wszystkie spodziewane wpływy powiązane z projektami, w jednym miejscu.",
};

export default function BudgetForecastPage() {
  const [tab, setTab] = useState<BudgetForecastTab>("prognoza");

  return (
    <>
      <PageHeader
        eyebrow="Finanse"
        title={TAB_LABELS[tab]}
        description={TAB_DESCRIPTIONS[tab]}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as BudgetForecastTab[]).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "secondary"}
            onClick={() => setTab(key)}
          >
            {TAB_LABELS[key]}
          </Button>
        ))}
      </div>

      {tab === "prognoza" ? <BudgetForecastDashboard /> : null}
      {tab === "koszty" ? <BudgetCostItemsManager /> : null}
      {tab === "pipeline" ? <BudgetPipelineOverview /> : null}
    </>
  );
}
