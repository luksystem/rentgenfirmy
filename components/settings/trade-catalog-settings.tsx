"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { FieldOptions, TradeCatalogItem } from "@/lib/field-options";
import { useAppStore } from "@/store/app-store";

function emptyItem(): TradeCatalogItem {
  return {
    name: "",
    communicationProtocols: [],
    description: "",
  };
}

export function TradeCatalogSettings() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const updateFieldOptions = useAppStore((state) => state.updateFieldOptions);
  const isSaving = useAppStore((state) => state.isSaving);
  const [items, setItems] = useState<TradeCatalogItem[]>(fieldOptions.tradeCatalogItems);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        communicationProtocols: [...new Set(item.communicationProtocols.map((entry) => entry.trim()).filter(Boolean))],
        description: item.description.trim(),
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
        Każda branża może mieć przypisane protokoły komunikacyjne — przy tworzeniu ustaleń protokoły
        uzupełnią się automatycznie po wyborze branży jako roli akceptacji.
      </p>

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

            <Field label="Domyślny opis / zakres">
              <Textarea
                rows={2}
                value={item.description}
                onChange={(event) => updateItem(index, { description: event.target.value })}
                placeholder="Krótki opis zakresu branży w projekcie"
              />
            </Field>

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
