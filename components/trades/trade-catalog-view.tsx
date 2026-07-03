"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, ChevronRight, HardHat, List, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TradeCompanyDetailDialog } from "@/components/trades/trade-company-detail-dialog";
import { companyItemToCatalogShape, groupTradeDirectory, tradeCompanyKey } from "@/lib/trades/company-pool";
import type { TradeCompanyWithProjects } from "@/lib/trades/company-types";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const TradeCatalogMapView = dynamic(
  () => import("@/components/trades/trade-catalog-map-view").then((module) => module.TradeCatalogMapView),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted">Ładowanie mapy firm…</p>,
  },
);

type ViewMode = "list" | "map";

function CatalogList({
  groups,
  onSelectCompany,
}: {
  groups: ReturnType<typeof groupTradeDirectory<TradeCompanyWithProjects>>;
  onSelectCompany: (companyKey: string) => void;
}) {
  if (!groups.length) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Katalog jest pusty. Zdefiniuj branże w{" "}
          <Link href="/ustawienia/branze" className="text-accent hover:underline">
            ustawieniach katalogu
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <Card key={group.tradeName}>
          <CardContent className="grid gap-3 pt-4">
            <div>
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-accent" />
                <p className="font-semibold text-foreground">{group.tradeName}</p>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted">
                  {group.companies.length}{" "}
                  {group.companies.length === 1 ? "firma" : group.companies.length < 5 ? "firmy" : "firm"}
                </span>
              </div>
              {group.category.description ? (
                <p className="mt-1 text-sm text-muted">{group.category.description}</p>
              ) : null}
              {group.category.communicationProtocols.length ? (
                <p className="mt-1 text-xs text-muted">
                  Protokoły: {group.category.communicationProtocols.join(", ")}
                </p>
              ) : null}
            </div>

            {group.companies.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {group.companies.map((company) => (
                  <button
                    key={tradeCompanyKey(company)}
                    type="button"
                    onClick={() => onSelectCompany(tradeCompanyKey(company))}
                    className="rounded-xl border border-border/70 bg-surface-muted/15 p-3 text-left transition hover:border-accent/40 hover:bg-accent/5"
                  >
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground">{company.company}</p>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                        </div>
                        {company.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{company.description}</p>
                        ) : null}
                        {[company.contactName, company.phone].filter(Boolean).length ? (
                          <p className="mt-1 text-xs text-muted">
                            {[company.contactName, company.phone].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        {company.projects.length ? (
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted">
                            {company.projects.map((project) => project.projectName).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Brak firm w bazie — dodaj wykonawców w projektach klientów.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TradeCatalogView() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const [companyPool, setCompanyPool] = useState<TradeCompanyWithProjects[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<TradeCompanyWithProjects | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [mapMounted, setMapMounted] = useState(false);

  useEffect(() => {
    void fetch("/api/trades/companies", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok) {
          setCompanyPool(payload.companies ?? []);
        }
      })
      .catch(() => setCompanyPool([]));
  }, [fieldOptions.tradeCompanies]);

  const groups = useMemo(
    () => groupTradeDirectory(fieldOptions.tradeCatalogItems, companyPool),
    [companyPool, fieldOptions.tradeCatalogItems],
  );

  const mapItems = useMemo(
    () => companyPool.map((company) => companyItemToCatalogShape(company)),
    [companyPool],
  );

  const companyCount = companyPool.length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            <List className="mr-2 h-4 w-4" />
            Baza firm ({companyCount})
          </Button>
          <Button
            type="button"
            variant={view === "map" ? "default" : "outline"}
            onClick={() => {
              setMapMounted(true);
              setView("map");
            }}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Mapa lokalizacji
          </Button>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/ustawienia/branze">
            <Settings className="mr-2 h-4 w-4" />
            Edytuj branże
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted">
        Branże to kategorie współpracy. Firmy wykonawcze z projektów różnych klientów gromadzą się tutaj
        pod właściwą branżą — baza do polecania wykonawców i przyszłych zleceń podwykonawców.
      </p>

      <div className={cn(view === "list" ? undefined : "hidden")}>
        <CatalogList
          groups={groups}
          onSelectCompany={(key) => {
            setSelectedCompany(companyPool.find((entry) => tradeCompanyKey(entry) === key) ?? null);
          }}
        />
      </div>

      <TradeCompanyDetailDialog
        company={selectedCompany}
        open={selectedCompany !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCompany(null);
          }
        }}
      />

      {mapMounted ? (
        <div className={cn(view === "map" ? undefined : "hidden")}>
          <TradeCatalogMapView items={mapItems} />
        </div>
      ) : null}
    </div>
  );
}
