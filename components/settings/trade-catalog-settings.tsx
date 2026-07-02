"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Building2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { FieldOptions, TradeCatalogItem } from "@/lib/field-options";
import { groupTradeDirectory } from "@/lib/trades/company-pool";
import type { TradeCompanyItem } from "@/lib/trades/company-types";
import { useAppStore } from "@/store/app-store";

function emptyCategory(): TradeCatalogItem {
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
  const [categories, setCategories] = useState<TradeCatalogItem[]>(fieldOptions.tradeCatalogItems);
  const [companyPool, setCompanyPool] = useState<TradeCompanyItem[]>(fieldOptions.tradeCompanies ?? []);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    try {
      const response = await fetch("/api/trades/companies", { credentials: "include" });
      const payload = await response.json();
      if (response.ok) {
        setCompanyPool(payload.companies ?? []);
      }
    } catch {
      setCompanyPool(fieldOptions.tradeCompanies ?? []);
    }
  }, [fieldOptions.tradeCompanies]);

  useEffect(() => {
    setCategories(fieldOptions.tradeCatalogItems);
  }, [fieldOptions.tradeCatalogItems]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const directory = useMemo(
    () => groupTradeDirectory(categories, companyPool),
    [categories, companyPool],
  );

  function updateCategory(index: number, patch: Partial<TradeCatalogItem>) {
    setCategories((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
    setSaved(false);
  }

  function toggleProtocol(index: number, protocol: string) {
    setCategories((current) =>
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

  function addCategory() {
    setCategories((current) => [...current, emptyCategory()]);
    setSaved(false);
  }

  function removeCategory(index: number) {
    setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSaved(false);
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) {
      return;
    }
    setCategories((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    const normalizedCategories = categories
      .map((item) => ({
        name: item.name.trim(),
        communicationProtocols: [
          ...new Set(item.communicationProtocols.map((entry) => entry.trim()).filter(Boolean)),
        ],
        description: item.description?.trim() ?? "",
      }))
      .filter((item) => item.name);

    if (normalizedCategories.length === 0) {
      setError("Dodaj co najmniej jedną branżę (kategorię).");
      return;
    }

    setError(null);
    const nextOptions: FieldOptions = {
      ...fieldOptions,
      tradeCatalogItems: normalizedCategories,
      tradeCompanies: fieldOptions.tradeCompanies ?? [],
    };
    await updateFieldOptions(nextOptions);
    setSaved(true);
    void loadCompanies();
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
        Branża to kategoria (np. HVAC, Elektryka). Firmy wykonawcze powstają w projektach klientów i
        trafiają do wspólnej bazy pod daną branżą — można je później polecać innym klientom.
      </p>

      {categories.map((category, index) => {
        const linked = directory.find(
          (group) => group.tradeName.trim().toLowerCase() === category.name.trim().toLowerCase(),
        );
        return (
          <Card key={`trade-category-${index}`}>
            <CardContent className="grid gap-3 pt-6">
              <div className="flex flex-wrap gap-2">
                <Field label="Branża (kategoria)">
                  <Input
                    value={category.name}
                    onChange={(event) => updateCategory(index, { name: event.target.value })}
                    placeholder="np. HVAC"
                  />
                </Field>
                <div className="flex items-end gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeCategory(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Field label="Domyślny opis / zakres branży">
                <Textarea
                  rows={2}
                  value={category.description ?? ""}
                  onChange={(event) => updateCategory(index, { description: event.target.value })}
                  placeholder="Krótki opis zakresu branży w projekcie"
                />
              </Field>

              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">Mapa protokołów komunikacyjnych</p>
                <div className="flex flex-wrap gap-2">
                  {fieldOptions.communicationProtocols.map((protocol) => {
                    const active = category.communicationProtocols.includes(protocol);
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

              <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-accent" />
                  Firmy w bazie ({linked?.companies.length ?? 0})
                </p>
                {linked?.companies.length ? (
                  <ul className="mt-2 grid gap-1 text-sm text-muted">
                    {linked.companies.map((company) => (
                      <li key={`${company.tradeName}::${company.company}`}>
                        <span className="text-foreground">{company.company}</span>
                        {[company.contactName, company.email].filter(Boolean).length ? (
                          <span> · {[company.contactName, company.email].filter(Boolean).join(" · ")}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    Brak firm — dodaj wykonawcę w projekcie klienta, wybierając tę branżę.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj branżę
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Zapisywanie…" : "Zapisz katalog branż"}
        </Button>
      </div>
    </div>
  );
}
