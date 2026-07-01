"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUp, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { FieldOptions, TradeCatalogItem } from "@/lib/field-options";
import { formatTradeCatalogAddress, geocodeTradeCatalogItem } from "@/lib/trades/catalog-location";
import { useAppStore } from "@/store/app-store";

const TradeCatalogMapView = dynamic(
  () => import("@/components/trades/trade-catalog-map-view").then((module) => module.TradeCatalogMapView),
  { ssr: false, loading: () => <p className="text-sm text-muted">Ładowanie mapy…</p> },
);

function emptyItem(): TradeCatalogItem {
  return {
    name: "",
    communicationProtocols: [],
    description: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressPostalCode: "",
    lat: null,
    lng: null,
  };
}

export function TradeCatalogSettings() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const updateFieldOptions = useAppStore((state) => state.updateFieldOptions);
  const isSaving = useAppStore((state) => state.isSaving);
  const [items, setItems] = useState<TradeCatalogItem[]>(fieldOptions.tradeCatalogItems);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocodingIndex, setGeocodingIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(fieldOptions.tradeCatalogItems);
  }, [fieldOptions.tradeCatalogItems]);

  function updateItem(index: number, patch: Partial<TradeCatalogItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
    setSaved(false);
  }

  function toggleProtocol(index: number, protocol: string) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }
        const hasProtocol = item.communicationProtocols.includes(protocol);
        return {
          ...item,
          communicationProtocols: hasProtocol
            ? item.communicationProtocols.filter((entry) => entry !== protocol)
            : [...item.communicationProtocols, protocol],
        };
      }),
    );
    setSaved(false);
  }

  async function geocodeItem(index: number) {
    const item = items[index];
    if (!formatTradeCatalogAddress(item) && !item.company?.trim()) {
      setError("Podaj adres lub nazwę firmy przed geokodowaniem.");
      return;
    }
    setGeocodingIndex(index);
    setError(null);
    try {
      const result = await geocodeTradeCatalogItem(item);
      if (!result) {
        setError(`Nie znaleziono lokalizacji dla: ${item.name || "branża"}.`);
        return;
      }
      updateItem(index, { lat: result.lat, lng: result.lng });
    } finally {
      setGeocodingIndex(null);
    }
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
    setSaved(false);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSaved(false);
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }
    setItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    const normalized = items
      .map((item) => ({
        name: item.name.trim(),
        communicationProtocols: [
          ...new Set(item.communicationProtocols.map((entry) => entry.trim()).filter(Boolean)),
        ],
        description: item.description?.trim() ?? "",
        company: item.company?.trim() ?? "",
        contactName: item.contactName?.trim() ?? "",
        email: item.email?.trim() ?? "",
        phone: item.phone?.trim() ?? "",
        addressStreet: item.addressStreet?.trim() ?? "",
        addressCity: item.addressCity?.trim() ?? "",
        addressPostalCode: item.addressPostalCode?.trim() ?? "",
        lat: item.lat ?? null,
        lng: item.lng ?? null,
      }))
      .filter((item) => item.name);

    if (normalized.length === 0) {
      setError("Dodaj co najmniej jedną branżę w katalogu.");
      return;
    }

    setError(null);
    const nextOptions: FieldOptions = {
      ...fieldOptions,
      tradeCatalogItems: normalized,
    };
    await updateFieldOptions(nextOptions);
    setSaved(true);
  }

  return (
    <div className="grid gap-4">
      {saved ? (
        <Card className="panel-success border">
          <CardContent className="py-3 text-sm text-emerald-300">Katalog branż został zapisany.</CardContent>
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-rose-500/30">
          <CardContent className="py-3 text-sm text-rose-400">{error}</CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted">
        Katalog jest wspólny dla całego zespołu. Branże podpowiadają się w projekcie klienta, a lokalizacje
        widać na mapie w module{" "}
        <a href="/branze" className="text-accent hover:underline">
          Katalog branż
        </a>
        .
      </p>

      <TradeCatalogMapView items={items.filter((item) => item.name.trim())} />

      {items.map((item, index) => (
        <Card key={`trade-catalog-${index}`}>
          <CardContent className="grid gap-3 pt-6">
            <div className="flex flex-wrap gap-2">
              <Field label="Nazwa branży" className="min-w-[200px] flex-1">
                <Input
                  value={item.name}
                  onChange={(event) => updateItem(index, { name: event.target.value })}
                  placeholder="np. Smart Home"
                />
              </Field>
              <div className="flex items-end gap-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Domyślna firma wykonawcy">
                <Input
                  value={item.company ?? ""}
                  onChange={(event) => updateItem(index, { company: event.target.value })}
                />
              </Field>
              <Field label="Osoba kontaktowa">
                <Input
                  value={item.contactName ?? ""}
                  onChange={(event) => updateItem(index, { contactName: event.target.value })}
                />
              </Field>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={item.email ?? ""}
                  onChange={(event) => updateItem(index, { email: event.target.value })}
                />
              </Field>
              <Field label="Telefon">
                <Input
                  value={item.phone ?? ""}
                  onChange={(event) => updateItem(index, { phone: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Domyślny opis / zakres">
              <Textarea
                rows={2}
                value={item.description ?? ""}
                onChange={(event) => updateItem(index, { description: event.target.value })}
                placeholder="Krótki opis zakresu branży w projekcie"
              />
            </Field>

            <div className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/15 p-3 sm:grid-cols-3">
              <Field label="Ulica">
                <Input
                  value={item.addressStreet ?? ""}
                  onChange={(event) => updateItem(index, { addressStreet: event.target.value })}
                />
              </Field>
              <Field label="Kod pocztowy">
                <Input
                  value={item.addressPostalCode ?? ""}
                  onChange={(event) => updateItem(index, { addressPostalCode: event.target.value })}
                />
              </Field>
              <Field label="Miasto">
                <Input
                  value={item.addressCity ?? ""}
                  onChange={(event) => updateItem(index, { addressCity: event.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={geocodingIndex === index}
                onClick={() => void geocodeItem(index)}
              >
                {geocodingIndex === index ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                Ustal lokalizację na mapie
              </Button>
              {item.lat != null && item.lng != null ? (
                <span className="text-xs text-muted">
                  Współrzędne: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                </span>
              ) : null}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">Mapa protokołów komunikacyjnych</p>
              <div className="flex flex-wrap gap-2">
                {fieldOptions.communicationProtocols.map((protocol) => {
                  const active = item.communicationProtocols.includes(protocol);
                  return (
                    <button
                      key={protocol}
                      type="button"
                      className={
                        active
                          ? "rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-medium text-foreground"
                          : "rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted hover:border-accent/30"
                      }
                      onClick={() => toggleProtocol(index, protocol)}
                    >
                      {protocol}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj branżę
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Zapisywanie…" : "Zapisz katalog"}
        </Button>
      </div>
    </div>
  );
}
