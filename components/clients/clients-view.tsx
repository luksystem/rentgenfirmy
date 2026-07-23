"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Activity, List, MapPin, Star } from "lucide-react";
import { ClientsTable } from "@/components/clients-table";
import { RecentClientsStrip } from "@/components/clients/recent-clients-strip";
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
import {
  getFavoriteClientIdSet,
  getRecentlyOpenedClientIds,
} from "@/lib/clients/client-recent-views";
import { sortClientsByActivity } from "@/lib/sort/activity-sort";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useClientRecentViewsStore } from "@/store/client-recent-views-store";

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

const ClientsHealthView = dynamic(
  () =>
    import("@/components/clients/clients-health-view").then((module) => module.ClientsHealthView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border/80 bg-surface p-8 text-sm text-muted">
        Ładowanie widoku zdrowia…
      </div>
    ),
  },
);

type ClientsViewMode = "list" | "map" | "health";

export function ClientsView() {
  const allClients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const recentViews = useClientRecentViewsStore((state) => state.views);
  const hydrateRecentViews = useClientRecentViewsStore((state) => state.hydrate);
  const togglePin = useClientRecentViewsStore((state) => state.togglePin);
  const authInitialized = useAuthStore((state) => state.isInitialized);
  const currentUserId = useAuthStore((state) => state.profile?.id ?? state.user?.id ?? null);
  const [view, setView] = useState<ClientsViewMode>("list");
  const [mapMounted, setMapMounted] = useState(false);
  const [healthMounted, setHealthMounted] = useState(false);
  const [filters, setFilters] = useState<ClientListFilters>(EMPTY_CLIENT_LIST_FILTERS);

  useEffect(() => {
    // Store czyta usera synchronicznie z auth-store — po twardym przeładowaniu
    // strony auth-store.initialize() jeszcze trwa, więc trzeba poczekać, inaczej
    // hydrate() po cichu nic nie pobiera i nigdy nie ponawia próby.
    if (!authInitialized || !currentUserId) {
      return;
    }
    void hydrateRecentViews();
  }, [authInitialized, currentUserId, hydrateRecentViews]);

  const favoriteClientIds = useMemo(() => getFavoriteClientIdSet(recentViews), [recentViews]);
  const recentClientIds = useMemo(() => getRecentlyOpenedClientIds(recentViews), [recentViews]);

  const filteredClients = useMemo(() => {
    const filtered = filterClients(allClients, filters, projects, favoriteClientIds);
    return sortClientsByActivity(filtered, projects, recentViews);
  }, [allClients, filters, projects, favoriteClientIds, recentViews]);

  const activeFilterCount = countActiveClientListFilters(filters);

  function updateFilters(patch: Partial<ClientListFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function openMapView() {
    setMapMounted(true);
    setView("map");
  }

  function openHealthView() {
    setHealthMounted(true);
    setView("health");
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
        <Button
          type="button"
          size="sm"
          variant={view === "health" ? "default" : "outline"}
          className={cn(view === "health" && "shadow-soft")}
          onClick={openHealthView}
        >
          <Activity className="mr-2 h-4 w-4" />
          Zdrowie
        </Button>
      </div>

      <RecentClientsStrip clients={allClients} recentClientIds={recentClientIds} />

      <div className="mb-4 rounded-2xl border border-border/80 bg-surface p-4">
        <Input
          type="search"
          className="mb-3 md:hidden"
          value={filters.nameQuery}
          onChange={(event) => updateFilters({ nameQuery: event.target.value })}
          placeholder="Szukaj po nazwie klienta…"
          aria-label="Szukaj po nazwie klienta"
        />
        <MobileFiltersPanel
          activeCount={activeFilterCount}
          onClear={() => setFilters(EMPTY_CLIENT_LIST_FILTERS)}
        >
          <div className="hidden gap-2 md:grid sm:grid-cols-2 lg:grid-cols-3">
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
            <Button
              type="button"
              size="sm"
              variant={filters.favoritesOnly ? "default" : "outline"}
              onClick={() => updateFilters({ favoritesOnly: !filters.favoritesOnly })}
              className="justify-self-start"
            >
              <Star className="mr-2 h-4 w-4" fill={filters.favoritesOnly ? "currentColor" : "none"} />
              Ulubieni
            </Button>
          </div>
          <div className="grid gap-2 md:hidden">
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
            <Button
              type="button"
              size="sm"
              variant={filters.favoritesOnly ? "default" : "outline"}
              onClick={() => updateFilters({ favoritesOnly: !filters.favoritesOnly })}
              className="justify-self-start"
            >
              <Star className="mr-2 h-4 w-4" fill={filters.favoritesOnly ? "currentColor" : "none"} />
              Ulubieni
            </Button>
          </div>
        </MobileFiltersPanel>
        <p className="mt-2 text-sm text-muted">
          Widocznych:{" "}
          <span className="font-medium text-foreground">{filteredClients.length}</span>
          {" · "}
          {allClients.length} w bazie
          {" · "}
          sortowanie: ostatnie otwarcie, zmiana klienta lub projektu
        </p>
      </div>

      <div className={view === "list" ? undefined : "hidden"}>
        <ClientsTable
          clients={filteredClients}
          favoriteClientIds={favoriteClientIds}
          onTogglePin={togglePin}
        />
      </div>

      {mapMounted ? (
        <div className={view === "map" ? undefined : "hidden"}>
          <ClientsMapView clients={filteredClients} />
        </div>
      ) : null}

      {healthMounted ? (
        <div className={view === "health" ? undefined : "hidden"}>
          <ClientsHealthView clients={filteredClients} projects={projects} />
        </div>
      ) : null}
    </>
  );
}
