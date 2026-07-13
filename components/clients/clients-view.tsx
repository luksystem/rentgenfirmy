"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { List, MapPin } from "lucide-react";
import { ClientsTable } from "@/components/clients-table";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  CLIENT_PROJECT_FILTER_OPTIONS,
  countActiveClientListFilters,
  EMPTY_CLIENT_LIST_FILTERS,
  filterClients,
  type ClientListFilters,
  type ClientProjectFilter,
} from "@/lib/clients/client-filters";
import { sortClientsByActivity } from "@/lib/sort/activity-sort";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

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
  const allClients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const [view, setView] = useState<ClientsViewMode>("list");
  const [mapMounted, setMapMounted] = useState(false);
  const [filters, setFilters] = useState<ClientListFilters>(EMPTY_CLIENT_LIST_FILTERS);

  const filteredClients = useMemo(() => {
    const filtered = filterClients(allClients, filters, projects);
    return sortClientsByActivity(filtered, projects, fieldOptions);
  }, [allClients, fieldOptions, filters, projects]);

  const activeFilterCount = countActiveClientListFilters(filters);

  function updateFilters(patch: Partial<ClientListFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function openMapView() {
    setMapMounted(true);
    setView("map");
  }

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
          onClick={openMapView}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Mapa
        </Button>
      </div>

      <div className="mb-4 rounded-2xl border border-border/80 bg-surface p-4">
        <MobileFiltersPanel
          activeCount={activeFilterCount}
          onClear={() => setFilters(EMPTY_CLIENT_LIST_FILTERS)}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              type="search"
              value={filters.nameQuery}
              onChange={(event) => updateFilters({ nameQuery: event.target.value })}
              placeholder="Szukaj po nazwie klienta…"
              aria-label="Szukaj po nazwie klienta"
            />
            <Input
              type="search"
              value={filters.addressQuery}
              onChange={(event) => updateFilters({ addressQuery: event.target.value })}
              placeholder="Szukaj po adresie…"
              aria-label="Szukaj po adresie"
            />
            <Select
              value={filters.projectFilter}
              onChange={(event) =>
                updateFilters({ projectFilter: event.target.value as ClientProjectFilter })
              }
              aria-label="Filtr przypisania projektu"
            >
              {CLIENT_PROJECT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </MobileFiltersPanel>
        <p className="mt-2 text-sm text-muted">
          Widocznych:{" "}
          <span className="font-medium text-foreground">{filteredClients.length}</span>
          {" · "}
          {allClients.length} w bazie
        </p>
      </div>

      <div className={view === "list" ? undefined : "hidden"}>
        <ClientsTable clients={filteredClients} />
      </div>

      {mapMounted ? (
        <div className={view === "map" ? undefined : "hidden"}>
          <ClientsMapView clients={filteredClients} />
        </div>
      ) : null}
    </>
  );
}
