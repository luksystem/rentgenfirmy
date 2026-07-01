"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

function TradeFormFields({
  form,
  onChange,
  catalogNames = [],
}: {
  form: ProjectTradeInput;
  onChange: (next: ProjectTradeInput) => void;
  catalogNames?: string[];
}) {
  return (
    <div className="grid gap-3">
      {catalogNames.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {catalogNames.map((name) => (
            <button
              key={name}
              type="button"
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                form.name === name
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
              )}
              onClick={() => onChange({ ...form, name })}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <Field label="Branża *">
        <Input
          value={form.name}
          placeholder="np. Klimatyzacja, Elektryka, Smart Home"
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </Field>
      <Field label="Firma">
        <Input
          value={form.company ?? ""}
          placeholder="Nazwa firmy wykonawcy"
          onChange={(event) => onChange({ ...form, company: event.target.value })}
        />
      </Field>
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
  const tradeCatalog = useAppStore((state) => state.fieldOptions.tradeCatalog);
  const trades = storeTrades;

  const availableCatalogNames = useMemo(
    () => tradeCatalog.filter((name) => !trades.some((trade) => trade.name === name)),
    [tradeCatalog, trades],
  );
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyTradeInput());
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
          Wykonawcy i branże w projekcie — wykorzystasz je przy rolach akceptacji w ustaleniach.
        </p>
        <div className="flex flex-wrap gap-2">
          {availableCatalogNames.slice(0, 4).map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void addTrade(projectId, { name, company: "", contactName: "", email: "", phone: "", description: "" })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {name}
            </Button>
          ))}
          <Button type="button" size="sm" className="shrink-0" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj branżę
          </Button>
        </div>
      </div>

      {isLoading && !trades.length ? (
        <p className="text-sm text-muted">Ładowanie branż…</p>
      ) : null}

      {!isLoading && trades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          Brak branż. Dodaj wykonawców (np. klimatyzacja, elektryka), aby móc przypisywać im role w
          procesie ustaleń.
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
          </article>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj branżę" : "Nowa branża"}</DialogTitle>
            <DialogDescription>
              Dane wykonawcy będą dostępne przy tworzeniu ról akceptacji w ustaleniach.
            </DialogDescription>
          </DialogHeader>
          <TradeFormFields form={form} onChange={setForm} catalogNames={tradeCatalog} />
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
