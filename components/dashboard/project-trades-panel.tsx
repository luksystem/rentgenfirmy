"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { emptyTradeInput, TradeFormFields } from "@/components/dashboard/trade-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectTrade, ProjectTradeInput } from "@/lib/dashboard/trade-types";
import type { TradeCatalogItem } from "@/lib/field-options";
import { findTradeCatalogItem } from "@/lib/field-options";
import { tradeCatalogItemToProjectTradeInput } from "@/lib/trades/catalog-location";
import type { TradeCompanyItem } from "@/lib/trades/company-types";
import { useAppStore } from "@/store/app-store";
import { useProjectTradeStore } from "@/store/project-trade-store";

const EMPTY_TRADES: ProjectTrade[] = [];

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
  const refreshFieldOptions = useAppStore((state) => state.refreshFieldOptions);
  const categories = useMemo(() => fieldOptions.tradeCatalogItems, [fieldOptions.tradeCatalogItems]);
  const [companyPool, setCompanyPool] = useState<TradeCompanyItem[]>(fieldOptions.tradeCompanies ?? []);
  const trades = storeTrades;
  const isLoading = loading && trades.length === 0;

  async function refreshCatalogSources() {
    try {
      const options = await refreshFieldOptions();
      setCompanyPool(options.tradeCompanies ?? []);
    } catch {
      // zostaw lokalny katalog
    }
    try {
      const response = await fetch("/api/trades/companies", { credentials: "include" });
      const payload = await response.json();
      if (response.ok) {
        setCompanyPool(payload.companies ?? []);
      }
    } catch {
      // pool firm jest opcjonalny
    }
  }

  useEffect(() => {
    void refreshCatalogSources();
    // tylko przy montowaniu panelu — pełne odświeżenie także przy otwarciu dialogu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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

  useEffect(() => {
    if (!dialogOpen) return;
    void refreshCatalogSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

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
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać wykonawcy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Wykonawcy przypisani do projektu. Firma trafia też do wspólnego katalogu branż.
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
            Dodaj wykonawcę
          </Button>
        </div>
      </div>

      {error && !dialogOpen ? <p className="text-sm text-rose-400">{error}</p> : null}

      {isLoading && !trades.length ? (
        <p className="text-sm text-muted">Ładowanie wykonawców…</p>
      ) : null}

      {!isLoading && trades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          Brak wykonawców. Dodaj firmę z katalogu (np. klimatyzacja, elektryka) lub ręcznie — będą
          dostępne przy rolach akceptacji w ustaleniach.
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
              <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 break-words text-sm text-muted">
                {trade.contactName ? <span>{trade.contactName}</span> : null}
                {trade.contactName && trade.email ? <span aria-hidden>·</span> : null}
                {trade.email ? (
                  <a href={`mailto:${trade.email}`} className="break-all text-accent hover:underline">
                    {trade.email}
                  </a>
                ) : null}
                {(trade.contactName || trade.email) && trade.phone ? (
                  <span aria-hidden>·</span>
                ) : null}
                {trade.phone ? (
                  <a
                    href={`tel:${trade.phone.replace(/\s/g, "")}`}
                    className="break-all text-accent hover:underline"
                  >
                    {trade.phone}
                  </a>
                ) : null}
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
            <DialogTitle>{editingId ? "Edytuj wykonawcę" : "Nowy Wykonawca"}</DialogTitle>
            <DialogDescription>
              Wybierz branżę z katalogu lub wpisz ręcznie — dane wykonawcy będą dostępne przy rolach
              akceptacji w ustaleniach.
            </DialogDescription>
          </DialogHeader>
          <TradeFormFields
            form={form}
            onChange={setForm}
            categories={categories}
            companyPool={companyPool}
          />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj wykonawcę"}
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
