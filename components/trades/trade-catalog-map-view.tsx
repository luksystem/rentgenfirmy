"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { TradeCatalogItem } from "@/lib/field-options";
import { tradeCatalogEntryKey } from "@/lib/trades/catalog-utils";
import {
  formatTradeCatalogAddress,
  geocodeTradeCatalogItem,
  hasTradeCatalogCoordinates,
  hasTradeCatalogGeocodableAddress,
} from "@/lib/trades/catalog-location";
import { getSmartHomeMarkerIcon } from "@/lib/clients/smart-home-marker-icon";
import "leaflet/dist/leaflet.css";

const POLAND_CENTER: [number, number] = [52.07, 19.48];

type PlacedTrade = {
  item: TradeCatalogItem;
  lat: number;
  lng: number;
  label: string;
};

function MapBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

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
  }, [map, points]);

  return null;
}

export function TradeCatalogMapView({ items }: { items: TradeCatalogItem[] }) {
  const [placed, setPlaced] = useState<PlacedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const next: PlacedTrade[] = [];
      const toGeocode = items.filter(
        (item) => hasTradeCatalogCoordinates(item) || hasTradeCatalogGeocodableAddress(item),
      );

      for (let index = 0; index < toGeocode.length; index += 1) {
        const item = toGeocode[index];
        if (cancelled) {
          return;
        }
        setProgress(`${index + 1}/${toGeocode.length}`);

        if (hasTradeCatalogCoordinates(item)) {
          next.push({
            item,
            lat: item.lat as number,
            lng: item.lng as number,
            label: formatTradeCatalogAddress(item) || item.company || item.name,
          });
          continue;
        }

        const coords = await geocodeTradeCatalogItem(item);
        if (coords) {
          next.push({
            item,
            lat: coords.lat,
            lng: coords.lng,
            label: coords.label,
          });
        }
      }

      if (!cancelled) {
        setPlaced(next);
        setLoading(false);
        setProgress("");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const points = useMemo(() => placed.map((entry) => [entry.lat, entry.lng] as [number, number]), [placed]);

  if (!items.some((item) => hasTradeCatalogCoordinates(item) || hasTradeCatalogGeocodableAddress(item))) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-6 text-sm text-muted">
        Brak lokalizacji w katalogu. Uzupełnij adresy wykonawców w ustawieniach katalogu branż, aby
        wyświetlić mapę.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ładowanie mapy branż{progress ? ` (${progress})` : ""}…
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border/80">
        <MapContainer center={POLAND_CENTER} zoom={6} className="h-[420px] w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds points={points} />
          {placed.map((entry) => (
            <Marker
              key={tradeCatalogEntryKey(entry.item)}
              position={[entry.lat, entry.lng]}
              icon={getSmartHomeMarkerIcon()}
            >
              <Popup>
                <div className="grid gap-1 text-sm">
                  <p className="font-semibold">{entry.item.name}</p>
                  {entry.item.company ? <p>{entry.item.company}</p> : null}
                  {entry.label ? (
                    <p className="flex items-start gap-1 text-xs text-muted">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      {entry.label}
                    </p>
                  ) : null}
                  {entry.item.email ? (
                    <p className="flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3" />
                      {entry.item.email}
                    </p>
                  ) : null}
                  {entry.item.phone ? (
                    <p className="flex items-center gap-1 text-xs">
                      <Phone className="h-3 w-3" />
                      {entry.item.phone}
                    </p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {!loading && placed.length === 0 ? (
        <p className="text-sm text-muted">
          Nie udało się zlokalizować branż na mapie. Sprawdź adresy w katalogu.
        </p>
      ) : null}
    </div>
  );
}
