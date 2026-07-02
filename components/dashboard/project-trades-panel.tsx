"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ProjectTrade, ProjectTradeInput } from "@/lib/dashboard/trade-types";
import type { TradeCatalogItem } from "@/lib/field-options";
import { findTradeCatalogItem } from "@/lib/field-options";
import { tradeCatalogItemToProjectTradeInput } from "@/lib/trades/catalog-location";
import {
  companiesForTrade,
  formatCatalogCompanyLabel,
  tradeCatalogEntryKey,
  uniqueTradeNames,
} from "@/lib/trades/catalog-utils";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useProjectTradeStore } from "@/store/project-trade-store";

const EMPTY_TRADES: ProjectTrade[] = [];

function emptyTradeInput(): ProjectTradeInput {
  return {
    name: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    description: "",
  };
}

function applyCatalogItem(form: ProjectTradeInput, item: TradeCatalogItem): ProjectTradeInput {
  const fromCatalog = tradeCatalogItemToProjectTradeInput(item);
  return {
    ...form,
    ...fromCatalog,
    company: form.company?.trim() ? form.company : fromCatalog.company,
    contactName: form.contactName?.trim() ? form.contactName : fromCatalog.contactName,
    email: form.email?.trim() ? form.email : fromCatalog.email,
    phone: form.phone?.trim() ? form.phone : fromCatalog.phone,
    description: form.description?.trim() ? form.description : fromCatalog.description,
  };
}

function TradeFormFields({
  form,
  onChange,
  catalogItems = [],
}: {
  form: ProjectTradeInput;
  onChange: (next: ProjectTradeInput) => void;
  catalogItems?: TradeCatalogItem[];
}) {
  const tradeNames = useMemo(() => uniqueTradeNames(catalogItems), [catalogItems]);
  const companiesForSelectedTrade = useMemo(
    () => (form.name.trim() ? companiesForTrade(form.name, catalogItems) : []),
    [catalogItems, form.name],
  );
  const companyQuery = (form.company ?? "").trim().toLowerCase();
  const companySuggestions = useMemo(() => {
    if (!form.name.trim()) {
      return catalogItems;
    }
    if (!companyQuery) {
      return companiesForSelectedTrade;
    }
    return companiesForSelectedTrade.filter((item) =>
      formatCatalogCompanyLabel(item).toLowerCase().includes(companyQuery),
    );
  }, [catalogItems, companiesForSelectedTrade, companyQuery, form.name]);

  return (
    <div className="grid gap-3">
      {tradeNames.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Branża z katalogu</p>
          <div className="flex flex-wrap gap-1.5">
            {tradeNames.map((tradeName) => (
              <button
                key={tradeName}
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  form.name === tradeName
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                )}
                onClick={() => {
                  const firstCompany = companiesForTrade(tradeName, catalogItems)[0];
                  onChange(
                    firstCompany
                      ? applyCatalogItem({ ...form, name: tradeName }, firstCompany)
                      : { ...form, name: tradeName },
                  );
                }}
              >
                {tradeName}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {companiesForSelectedTrade.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Firmy w branży „{form.name}”
          </p>
          <div className="flex flex-wrap gap-1.5">
            {companiesForSelectedTrade.map((item) => (
              <button
                key={tradeCatalogEntryKey(item)}
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  form.company === item.company && form.name === item.name
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                )}
                onClick={() => onChange(applyCatalogItem(form, item))}
              >
                {formatCatalogCompanyLabel(item)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Ta sama branża może mieć kilku wykonawców — wybierz firmę z katalogu lub wpisz ręcznie.
          </p>
        </div>
      ) : null}

      <Field label="Branża *">
        <Input
          value={form.name}
          placeholder="np. Klimatyzacja, Elektryka, Smart Home"
          list="trade-catalog-suggestions"
          onChange={(event) => {
            const nextName = event.target.value;
            const matches = companiesForTrade(nextName, catalogItems);
            if (matches.length === 1) {
              onChange(applyCatalogItem({ ...form, name: nextName }, matches[0]));
              return;
            }
            onChange({ ...form, name: nextName });
          }}
        />
        {tradeNames.length > 0 ? (
          <datalist id="trade-catalog-suggestions">
            {tradeNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        ) : null}
      </Field>

      <Field label="Firma wykonawcy">
        <Input
          value={form.company ?? ""}
          placeholder="Nazwa firmy — podpowiedzi z katalogu dla wybranej branży"
          list="trade-company-suggestions"
          onChange={(event) => {
            const nextCompany = event.target.value;
            const match = companiesForSelectedTrade.find(
              (item) => (item.company ?? "").toLowerCase() === nextCompany.trim().toLowerCase(),
            );
            if (match) {
              onChange(applyCatalogItem({ ...form, company: nextCompany }, match));
              return;
            }
            onChange({ ...form, company: nextCompany });
          }}
        />
        {companySuggestions.length > 0 ? (
          <datalist id="trade-company-suggestions">
            {companySuggestions.map((item) => (
              <option key={tradeCatalogEntryKey(item)} value={item.company ?? ""} />
            ))}
          </datalist>
        ) : null}
      </Field>

      {companyQuery && companySuggestions.length > 0 && companySuggestions.length <= 8 ? (
        <div className="flex flex-wrap gap-1.5">
          {companySuggestions.map((item) => (
            <button
              key={`company-suggestion-${tradeCatalogEntryKey(item)}`}
              type="button"
              className="rounded-lg border border-border/70 px-2 py-1 text-left text-xs text-muted hover:border-accent/30 hover:text-foreground"
              onClick={() => onChange(applyCatalogItem(form, item))}
            >
              <span className="font-medium text-foreground">{formatCatalogCompanyLabel(item)}</span>
              <span className="text-muted"> · {item.name}</span>
            </button>
          ))}
        </div>
      ) : null}
      <Field label="Osoba kontaktowa">
        <Input
          value={form.contactName ?? ""}
          placeholder="Imię i nazwisko"
          onChange={(event) => onChange({ ...form, contactName: event.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail">
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
          />
        </Field>
        <Field label="Telefon">
          <Input
            type="tel"
            value={form.phone ?? ""}
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Zakres prac / opis">
        <Textarea
          value={form.description ?? ""}
          rows={3}
          placeholder="Krótki opis tego, co ta branża wykona w projekcie…"
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </Field>
    </div>
  );
}

export function ProjectTradesPanel({
  projectId,
  seedTrades,
}: {
  projectId: string;
  seedTrades?: ProjectTrade[];
}) {
  const storeTrades = useProjectTradeStore((state) => state.byProject[projectId] ?? EMPTY_TRADES);
  const loading = useProjectTradeStore((state) => state.loadingProjects[projectId]);
  const ensureTrades = useProjectTradeStore((state) => state.ensureTrades);
  const seedProjectTrades = useProjectTradeStore((state) => state.seedProjectTrades);
  const addTrade = useProjectTradeStore((state) => state.addTrade);
  const updateTrade = useProjectTradeStore((state) => state.updateTrade);
  const removeTrade = useProjectTradeStore((state) => state.removeTrade);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const catalogItems = useMemo(() => fieldOptions.tradeCatalogItems, [fieldOptions.tradeCatalogItems]);
  const trades = storeTrades;
  const isLoading = loading && trades.length === 0;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectTradeInput>(emptyTradeInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seedTrades !== undefined) {
      seedProjectTrades(projectId, seedTrades);
    }
    void ensureTrades(projectId, { force: seedTrades !== undefined });
  }, [ensureTrades, projectId, seedProjectTrades, seedTrades]);

  function openCreate(prefill?: TradeCatalogItem) {
    setEditingId(null);
    setForm(prefill ? tradeCatalogItemToProjectTradeInput(prefill) : emptyTradeInput());
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(trade: ProjectTrade) {
    setEditingId(trade.id);
    setForm({
      name: trade.name,
      company: trade.company,
      contactName: trade.contactName,
      email: trade.email,
      phone: trade.phone,
      description: trade.description,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Podaj nazwę branży.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateTrade(projectId, editingId, form);
      } else {
        await addTrade(projectId, form);
      }
      setDialogOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać branży.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Firmy z projektu synchronizują się z katalogiem branż (branża + firma).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/ustawienia/branze">
              <Settings className="mr-1 h-3.5 w-3.5" />
              Ustawienia katalogu branż
            </Link>
          </Button>
          <Button type="button" size="sm" className="shrink-0" onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj branżę
          </Button>
        </div>
      </div>

      {error && !dialogOpen ? <p className="text-sm text-rose-400">{error}</p> : null}

      {isLoading && !trades.length ? (
        <p className="text-sm text-muted">Ładowanie branż…</p>
      ) : null}

      {!isLoading && trades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          Brak branż. Dodaj wykonawców z katalogu (np. klimatyzacja, elektryka) lub ręcznie — będą dostępne
          przy rolach akceptacji w ustaleniach.
        </p>
      ) : null}

      <div className="grid gap-3">
        {trades.map((trade) => (
          <article
            key={trade.id}
            className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-surface-muted/15 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-medium text-foreground">{trade.name}</p>
                  {!trade.email?.trim() ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                      Nieaktywna
                    </span>
                  ) : null}
                </div>
                {trade.company ? (
                  <p className="mt-0.5 break-words text-sm text-muted">{trade.company}</p>
                ) : !trade.email?.trim() ? (
                  <p className="mt-0.5 text-sm text-muted">Brak adresu e-mail wykonawcy</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(trade)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void removeTrade(projectId, trade.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {trade.contactName || trade.email || trade.phone ? (
              <p className="mt-2 break-words text-sm text-muted">
                {[trade.contactName, trade.email, trade.phone].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {trade.description ? (
              <p className="mt-2 break-words whitespace-pre-wrap text-sm text-foreground/90">
                {trade.description}
              </p>
            ) : null}
            {(() => {
              const catalogItem = findTradeCatalogItem(trade.name, fieldOptions);
              if (!catalogItem?.communicationProtocols.length) {
                return null;
              }
              return (
                <p className="mt-2 text-xs text-muted">
                  Protokoły (katalog):{" "}
                  <span className="font-medium text-foreground/90">
                    {catalogItem.communicationProtocols.join(", ")}
                  </span>
                </p>
              );
            })()}
          </article>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj branżę" : "Nowa branża"}</DialogTitle>
            <DialogDescription>
              Wybierz branżę z katalogu lub wpisz ręcznie — dane wykonawcy będą dostępne przy rolach
              akceptacji w ustaleniach.
            </DialogDescription>
          </DialogHeader>
          <TradeFormFields form={form} onChange={setForm} catalogItems={catalogItems} />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj branżę"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
