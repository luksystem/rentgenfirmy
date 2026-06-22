"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { List, MapPin } from "lucide-react";
import { ClientsTable } from "@/components/clients-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ClientsMapView = dynamic(
  () => import("@/components/clients/clients-map-view").then((module) => module.ClientsMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border/80 bg-surface p-8 text-sm text-muted">
        Ładowanie mapy klientów…
      </div>
    ),
  },
);

type ClientsViewMode = "list" | "map";

export function ClientsView() {
  const [view, setView] = useState<ClientsViewMode>("list");

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          className={cn(view === "list" && "shadow-soft")}
          onClick={() => setView("list")}
        >
          <List className="mr-2 h-4 w-4" />
          Lista
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "map" ? "default" : "outline"}
          className={cn(view === "map" && "shadow-soft")}
          onClick={() => setView("map")}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Mapa
        </Button>
      </div>

      {view === "list" ? <ClientsTable /> : <ClientsMapView />}
    </>
  );
}
