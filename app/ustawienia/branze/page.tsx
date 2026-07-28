"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Link2 } from "lucide-react";
import { TradeCatalogSettings } from "@/components/settings/trade-catalog-settings";
import { TradeContactPointsSettings } from "@/components/settings/trade-contact-points-settings";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TradeCatalogTab = "branze" | "punkty-styku";

const TABS: Array<{ id: TradeCatalogTab; label: string; icon: typeof Building2 }> = [
  { id: "branze", label: "Branże", icon: Building2 },
  { id: "punkty-styku", label: "Punkty styku", icon: Link2 },
];

function TradeCatalogSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TradeCatalogTab = tabParam === "punkty-styku" ? "punkty-styku" : "branze";

  function selectTab(tab: TradeCatalogTab) {
    router.replace(tab === "branze" ? "/ustawienia/branze" : `/ustawienia/branze?tab=${tab}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia"
        title="Katalog branż"
        description="Standardowe branże projektowe z mapą protokołów komunikacyjnych oraz punkty styku generujące podpowiedzi ustaleń."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ustawienia">Wróć do ustawień</Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "branze" ? <TradeCatalogSettings /> : null}
      {activeTab === "punkty-styku" ? <TradeContactPointsSettings /> : null}
    </>
  );
}

export default function TradeCatalogSettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie katalogu branż…</p>}>
      <TradeCatalogSettingsContent />
    </Suspense>
  );
}
