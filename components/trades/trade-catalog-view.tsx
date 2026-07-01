"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { HardHat, List, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TradeCatalogItem } from "@/lib/field-options";
import { formatTradeCatalogAddress } from "@/lib/trades/catalog-location";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const TradeCatalogMapView = dynamic(
  () => import("@/components/trades/trade-catalog-map-view").then((module) => module.TradeCatalogMapView),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted">Ładowanie mapy branż…</p>,
  },
);

type ViewMode = "list" | "map";

function CatalogList({ items }: { items: TradeCatalogItem[] }) {
  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Katalog jest pusty. Dodaj branże w{" "}
          <Link href="/ustawienia/branze" className="text-accent hover:underline">
            ustawieniach katalogu
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.name}>
          <CardContent className="grid gap-2 pt-4">
            <div className="flex items-start gap-2">
              <HardHat className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                {item.company ? <p className="text-sm text-muted">{item.company}</p> : null}
              </div>
            </div>
            {item.description ? <p className="text-sm text-muted">{item.description}</p> : null}
            {item.communicationProtocols.length ? (
              <p className="text-xs text-muted">
                Protokoły:{" "}
                <span className="font-medium text-foreground/90">
                  {item.communicationProtocols.join(", ")}
                </span>
              </p>
            ) : null}
            {formatTradeCatalogAddress(item) ? (
              <p className="flex items-start gap-1 text-xs text-muted">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                {formatTradeCatalogAddress(item)}
              </p>
            ) : null}
            {[item.contactName, item.email, item.phone].filter(Boolean).length ? (
              <p className="text-xs text-muted">
                {[item.contactName, item.email, item.phone].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TradeCatalogView() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const items = useMemo(() => fieldOptions.tradeCatalogItems, [fieldOptions.tradeCatalogItems]);
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
            Lista ({items.length})
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
