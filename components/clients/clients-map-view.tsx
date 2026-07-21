"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  FolderKanban,
  Thermometer,
} from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { ProjectTelemetrySnapshot } from "@/lib/integrations/types";
import { formatPartyName } from "@/lib/party/display-name";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import { clientHasGeocodableAddress, formatClientAddress, buildClientGeocodeFingerprint } from "@/lib/clients/client-location";
import { geocodeClientsSequential } from "@/lib/clients/geocode-client";
import { getSmartHomeMarkerIcon } from "@/lib/clients/smart-home-marker-icon";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrlFromCoords,
} from "@/lib/dashboard/google-maps";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import "leaflet/dist/leaflet.css";

type PlacedClient = {
  client: Client;
  lat: number;
  lng: number;
  label: string;
};

const POLAND_CENTER: [number, number] = [52.07, 19.48];
const DEFAULT_ZOOM = 6;

function MapBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(POLAND_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(points, { padding: [48, 48], maxZoom: 12 });
  }, [map, points]);

  return null;
}

function formatTelemetryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ClientMapPopup({
  client,
  projects,
  address,
  lat,
  lng,
  telemetryByProject,
}: {
  client: Client;
  projects: Project[];
  address: string;
  lat: number;
  lng: number;
  telemetryByProject: Map<string, ProjectTelemetrySnapshot[]>;
}) {
  const directionsUrl =
    buildGoogleMapsDirectionsUrlFromCoords(lat, lng) ??
    buildGoogleMapsDirectionsUrl(address);

  return (
    <div className="min-w-[220px] max-w-[280px] text-sm text-foreground">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Smart Home / BMS</p>
      <p className="mt-1 text-base font-semibold leading-snug">{formatPartyName(client)}</p>
      {address ? <p className="mt-1 text-xs leading-relaxed text-muted">{address}</p> : null}

      {client.phone || client.email ? (
        <div className="mt-3 grid gap-2">
          {client.phone ? (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-muted/40 px-2.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/5"
            >
              <Phone className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 break-all">{client.phone}</span>
            </a>
          ) : null}
          {client.email ? (
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-muted/40 px-2.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/5"
            >
              <Mail className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 break-all">{client.email}</span>
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {directionsUrl ? (
          <Button type="button" size="sm" variant="outline" className="h-8" asChild>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="mr-1.5 h-3.5 w-3.5" />
              Wyznacz trasę
            </a>
          </Button>
        ) : null}
        <Button type="button" size="sm" className="h-8" asChild>
          <Link href={`/przestrzenie/klient/${client.id}`}>
            <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
            Dashboard
          </Link>
        </Button>
        <Button type="button" size="sm" variant="secondary" className="h-8" asChild>
          <Link href={`/tablice-wdrozen/${client.id}`}>
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
            Tablice
          </Link>
        </Button>
      </div>

      <div className="mt-3 border-t border-border/70 pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <FolderKanban className="h-3.5 w-3.5" />
          Projekty klienta
        </p>
        {projects.length === 0 ? (
          <p className="text-xs text-muted">Brak przypisanych projektów.</p>
        ) : (
          <ul className="grid gap-1.5">
            {projects.map((project) => {
              const telemetry = telemetryByProject.get(project.id) ?? [];
              return (
              <li key={project.id}>
                <Link
                  href={`/przestrzenie/klient/${client.id}?project=${project.id}`}
                  className="block rounded-lg border border-border/70 bg-surface-muted/40 px-2.5 py-2 transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <p className="font-medium leading-snug">{project.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {project.type} · {project.stage}
                  </p>
                  {telemetry.length > 0 ? (
                    <ul className="mt-2 grid gap-1 border-t border-border/60 pt-2">
                      {telemetry.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-start gap-1.5 text-[11px] text-foreground/90"
                        >
                          <Thermometer className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400" />
                          <span>
                            <span className="font-medium">
                              {entry.sourceName ?? entry.integrationName}:
                            </span>{" "}
                            {entry.temperature != null ? `${entry.temperature.toFixed(1)}°C` : "—"}
                            {" · "}
                            {entry.onlineStatus ? "online" : "offline"}
                            {" · "}
                            {formatTelemetryTime(entry.measuredAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Link>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ClientsMapView({ clients }: { clients: Client[] }) {
  const projects = useAppStore((state) => state.projects);
  const [placedClients, setPlacedClients] = useState<PlacedClient[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [telemetryByProject, setTelemetryByProject] = useState<Map<string, ProjectTelemetrySnapshot[]>>(
    new Map(),
  );

  const geocodableClients = useMemo(
    () => clients.filter((client) => clientHasGeocodableAddress(client)),
    [clients],
  );

  const missingAddressClients = useMemo(
    () => clients.filter((client) => !clientHasGeocodableAddress(client)),
    [clients],
  );

  const projectsByClient = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const project of projects) {
      if (!project.clientId) {
        continue;
      }
      const list = map.get(project.clientId) ?? [];
      list.push(project);
      map.set(project.clientId, list);
    }
    for (const list of map.values()) {
      list.sort((left, right) => left.name.localeCompare(right.name, "pl"));
    }
    return map;
  }, [projects]);

  const geocodeFingerprint = useMemo(
    () => buildClientGeocodeFingerprint(geocodableClients),
    [geocodableClients],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!geocodableClients.length) {
        setPlacedClients([]);
        setLoading(false);
        setProgress({ done: 0, total: 0 });
        return;
      }

      setLoading(true);
      setError(null);
      setPlacedClients([]);
      setProgress({ done: 0, total: geocodableClients.length });

      const placed: PlacedClient[] = [];

      await geocodeClientsSequential(geocodableClients, (client, done, total, coords) => {
        if (cancelled) {
          return;
        }

        if (coords) {
          placed.push({
            client,
            lat: coords.lat,
            lng: coords.lng,
            label: coords.label,
          });
          setPlacedClients([...placed]);
        }

        setProgress({ done, total });
      });

      if (!cancelled) {
        setLoading(false);
        if (placed.length < geocodableClients.length) {
          setError("Część adresów nie została zlokalizowana — sprawdź listę poniżej mapy.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geocodeFingerprint, geocodableClients]);

  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);

  useEffect(() => {
    if (projectIds.length === 0) {
      setTelemetryByProject(new Map());
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/map/telemetry?projectIds=${encodeURIComponent(projectIds.join(","))}`,
          { credentials: "include" },
        );
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as {
          byProjectId?: Record<string, ProjectTelemetrySnapshot[]>;
        };
        if (cancelled) {
          return;
        }
        setTelemetryByProject(new Map(Object.entries(payload.byProjectId ?? {})));
      } catch {
        // Telemetria na mapie jest opcjonalna — brak danych nie blokuje mapy.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectIds]);

  const mapPoints = useMemo(
    () => placedClients.map((entry) => [entry.lat, entry.lng] as [number, number]),
    [placedClients],
  );

  const notFoundClients = useMemo(() => {
    const placedIds = new Set(placedClients.map((entry) => entry.client.id));
    return geocodableClients.filter((client) => !placedIds.has(client.id));
  }, [geocodableClients, placedClients]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 p-4">
        <div>
          <p className="font-semibold text-foreground">Mapa instalacji Smart Home</p>
          <p className="text-sm text-muted">
            {placedClients.length} lokalizacji na mapie · {clients.length} klientów w bazie
          </p>
        </div>
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Lokalizowanie adresów {progress.done}/{progress.total}
          </p>
        ) : null}
      </div>

      <div className="relative h-[min(70vh,640px)] min-h-[420px] w-full">
        <MapContainer
          center={POLAND_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds points={mapPoints} />
          {placedClients.map((entry) => (
            <Marker
              key={entry.client.id}
              position={[entry.lat, entry.lng]}
              icon={getSmartHomeMarkerIcon(activeClientId === entry.client.id)}
              eventHandlers={{
                click: () => setActiveClientId(entry.client.id),
                popupclose: () =>
                  setActiveClientId((current) => (current === entry.client.id ? null : current)),
              }}
            >
              <Popup className="client-map-popup" minWidth={240}>
                <ClientMapPopup
                  client={entry.client}
                  projects={projectsByClient.get(entry.client.id) ?? []}
                  address={formatClientAddress(entry.client) || entry.label}
                  lat={entry.lat}
                  lng={entry.lng}
                  telemetryByProject={telemetryByProject}
                />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading && placedClients.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
            <p className="rounded-xl border border-border/80 bg-surface px-4 py-3 text-sm text-muted shadow-card">
              Przygotowywanie mapy klientów…
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="border-t border-border/70 px-4 py-3 text-sm text-amber-300">{error}</p> : null}

      {(notFoundClients.length > 0 || missingAddressClients.length > 0) && !loading ? (
        <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-2">
          {notFoundClients.length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-muted" />
                Nie znaleziono na mapie
              </p>
              <ul className="mt-2 grid gap-1 text-xs text-muted">
                {notFoundClients.map((client) => (
                  <li key={client.id}>
                    {formatPartyName(client)} — {formatClientAddress(client) || client.location || "brak adresu"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {missingAddressClients.length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">Bez adresu do mapy</p>
              <ul className="mt-2 grid gap-1 text-xs text-muted">
                {missingAddressClients.map((client) => (
                  <li key={client.id}>
                    <Link href={`/przestrzenie/klient/${client.id}`} className="hover:text-foreground">
                      {formatPartyName(client)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
