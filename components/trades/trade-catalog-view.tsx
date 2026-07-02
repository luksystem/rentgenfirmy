"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, HardHat, List, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TradeCatalogItem } from "@/lib/field-options";
import { formatTradeCatalogAddress } from "@/lib/trades/catalog-location";
import { groupCatalogByTrade, tradeCatalogEntryKey } from "@/lib/trades/catalog-utils";
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

function CatalogList({ items }: { items: TradeCatalogItem[] }) {
  const groups = useMemo(() => groupCatalogByTrade(items), [items]);

  if (!groups.length) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Katalog jest pusty. Dodaj firmy wykonawców w{" "}
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
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-accent" />
              <p className="font-semibold text-foreground">{group.tradeName}</p>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted">
                {group.companies.length}{" "}
                {group.companies.length === 1 ? "firma" : group.companies.length < 5 ? "firmy" : "firm"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.companies.map((item) => (
                <div
                  key={tradeCatalogEntryKey(item)}
                  className="rounded-xl border border-border/70 bg-surface-muted/15 p-3"
                >
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {item.company?.trim() || "Firma bez nazwy"}
                      </p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-muted">{item.description}</p>
                      ) : null}
                      {item.communicationProtocols.length ? (
                        <p className="mt-1 text-xs text-muted">
                          Protokoły: {item.communicationProtocols.join(", ")}
                        </p>
                      ) : null}
                      {formatTradeCatalogAddress(item) ? (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          {formatTradeCatalogAddress(item)}
                        </p>
                      ) : null}
                      {[item.contactName, item.email, item.phone].filter(Boolean).length ? (
                        <p className="mt-1 text-xs text-muted">
                          {[item.contactName, item.email, item.phone].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TradeCatalogView() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const items = useMemo(() => fieldOptions.tradeCatalogItems, [fieldOptions.tradeCatalogItems]);
  const companyCount = items.filter((item) => item.company?.trim()).length;
  const [view, setView] = useState<ViewMode>("list");
  const [mapMounted, setMapMounted] = useState(false);

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
            Firmy ({companyCount || items.length})
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
            Edytuj katalog
          </Link>
        </Button>
      </div>

      <div className={cn(view === "list" ? undefined : "hidden")}>
        <CatalogList items={items} />
      </div>

      {mapMounted ? (
        <div className={cn(view === "map" ? undefined : "hidden")}>
          <TradeCatalogMapView items={items} />
        </div>
      ) : null}
    </div>
  );
}
