"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clientHasGeocodableAddress } from "@/lib/clients/client-location";
import { geocodeClientsSequential } from "@/lib/clients/geocode-client";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";
import { getVizStoreMarkerIcon } from "@/lib/viz/store-marker-icon";
import { STORE_QUICK_LINK_TABS, storeTabHref } from "@/lib/viz/store-tab-slugs";
import { useAppStore } from "@/store/app-store";
import "leaflet/dist/leaflet.css";

const POLAND_CENTER: [number, number] = [52.07, 19.48];

type PlacedStore = VizStoreLiveSnapshot & {
  lat: number;
  lng: number;
};

function MapBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const pointsKey = useMemo(
    () => points.map(([lat, lng]) => `${lat.toFixed(5)}:${lng.toFixed(5)}`).join("|"),
    [points],
  );

  useEffect(() => {
    if (!points.length) {
      map.setView(POLAND_CENTER, 6);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(points, { padding: [48, 48], maxZoom: 11 });
  }, [map, points, pointsKey]);
  return null;
}

type VizDashboardMapProps = {
  dashboardId: string;
  snapshots: VizStoreLiveSnapshot[];
};

export function VizDashboardMap({ dashboardId, snapshots }: VizDashboardMapProps) {
  const clients = useAppStore((s) => s.clients);
  const [placed, setPlaced] = useState<PlacedStore[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    async function geocodeStores() {
      setIsGeocoding(true);
      const withOverride: PlacedStore[] = [];
      const toGeocode: Array<{ snapshot: VizStoreLiveSnapshot; client: (typeof clients)[0] }> = [];

      for (const snapshot of snapshots) {
        if (snapshot.latOverride != null && snapshot.lngOverride != null) {
          withOverride.push({
            ...snapshot,
            lat: snapshot.latOverride,
            lng: snapshot.lngOverride,
          });
          continue;
        }

        if (!snapshot.clientId) {
          continue;
        }

        const client = clientsById.get(snapshot.clientId);
        if (!client || !clientHasGeocodableAddress(client)) {
          continue;
        }

        toGeocode.push({ snapshot, client });
      }

      const geocoded = await geocodeClientsSequential(
        toGeocode.map((entry) => entry.client),
        undefined,
        undefined,
        { signal: abort.signal },
      );
      if (cancelled || abort.signal.aborted) {
        return;
      }

      const placedStores: PlacedStore[] = [...withOverride];

      for (const entry of toGeocode) {
        const coords = geocoded.get(entry.client.id);
        if (!coords) {
          continue;
        }
        placedStores.push({
          ...entry.snapshot,
          lat: coords.lat,
          lng: coords.lng,
        });
      }

      setPlaced(placedStores);
      setIsGeocoding(false);
    }

    void geocodeStores();
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [snapshots, clientsById]);

  const points = useMemo(
    () => placed.map((store) => [store.lat, store.lng] as [number, number]),
    [placed],
  );
  const missingCount = snapshots.length - placed.length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">Mapa sklepów</h2>
        <p className="text-xs text-muted">
          Lokalizacja z klienta projektu. {isGeocoding ? "Geokodowanie…" : `${placed.length} na mapie`}
          {missingCount > 0 ? ` · ${missingCount} bez współrzędnych` : ""}
        </p>
      </div>

      <div className="relative h-[420px] w-full">
        {isGeocoding && !placed.length ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : null}

        <MapContainer center={POLAND_CENTER} zoom={6} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds points={points} />
          {placed.map((store) => (
            <Marker
              key={store.projectId}
              position={[store.lat, store.lng]}
              icon={getVizStoreMarkerIcon(store.status.code)}
            >
              <Popup>
                <div className="min-w-[200px] text-sm">
                  <p className="font-semibold">{store.displayName ?? store.projectName}</p>
                  <p className="text-xs text-muted">{store.clientAddress ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={store.status.tone}>{store.status.label}</Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <dt className="text-muted">Temp.</dt>
                    <dd>{store.roles.store_temperature?.displayValue ?? "—"}</dd>
                    <dt className="text-muted">Setpoint</dt>
                    <dd>{store.roles.store_setpoint?.displayValue ?? "—"}</dd>
                    <dt className="text-muted">Zgłoszenia</dt>
                    <dd>{store.openServiceRequests || "—"}</dd>
                  </dl>
                  <Link
                    href={`/wizualizacje/${dashboardId}/sklep/${store.projectId}`}
                    className="mt-2 inline-block text-xs text-accent hover:underline"
                  >
                    Szczegóły sklepu
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STORE_QUICK_LINK_TABS.map((tab) => (
                      <Link
                        key={tab}
                        href={storeTabHref(dashboardId, store.projectId, tab)}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-accent"
                      >
                        {tab}
                      </Link>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </Card>
  );
}
