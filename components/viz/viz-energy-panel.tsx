"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VizEnergyInvoice } from "@/lib/viz/energy-types";
import { VizEnergyTrendWidget } from "@/components/viz/viz-energy-trend-widget";

type VizEnergyPanelProps = {
  dashboardId: string;
  projectId: string;
  canUpload: boolean;
  canAnalyze: boolean;
};

export function VizEnergyPanel({
  dashboardId,
  projectId,
  canUpload,
  canAnalyze,
}: VizEnergyPanelProps) {
  const [invoices, setInvoices] = useState<VizEnergyInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [billingPeriodStart, setBillingPeriodStart] = useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState("");
  const [totalKwh, setTotalKwh] = useState("");
  const [totalCostPln, setTotalCostPln] = useState("");

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/energy?projectId=${encodeURIComponent(projectId)}`,
      );
      if (!response.ok) {
        throw new Error("Nie udało się pobrać faktur energii.");
      }
      const data = (await response.json()) as { invoices: VizEnergyInvoice[] };
      setInvoices(data.invoices);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, projectId]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!canUpload || !file) {
      setError("Wybierz plik PDF faktury.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("file", file);
      formData.set("supplierName", supplierName);
      formData.set("billingPeriodStart", billingPeriodStart);
      formData.set("billingPeriodEnd", billingPeriodEnd);
      formData.set("totalKwh", totalKwh);
      formData.set("totalCostPln", totalCostPln);

      const response = await fetch(`/api/viz/dashboards/${dashboardId}/energy`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Błąd zapisu faktury.");
      }

      setFile(null);
      setSupplierName("");
      setBillingPeriodStart("");
      setBillingPeriodEnd("");
      setTotalKwh("");
      setTotalCostPln("");
      await loadInvoices();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Błąd uploadu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAnalyze(invoiceId: string) {
    if (!canAnalyze) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/energy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Błąd analizy faktury.");
      }

      await loadInvoices();
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Błąd analizy.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie faktur energii…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <VizEnergyTrendWidget dashboardId={dashboardId} projectId={projectId} />
      {canUpload ? (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Dodaj fakturę energii (PDF)</h3>
          <form onSubmit={(e) => void handleUpload(e)} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Input placeholder="Dostawca energii" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            <Input placeholder="Zużycie kWh" value={totalKwh} onChange={(e) => setTotalKwh(e.target.value)} />
            <Input type="date" value={billingPeriodStart} onChange={(e) => setBillingPeriodStart(e.target.value)} />
            <Input type="date" value={billingPeriodEnd} onChange={(e) => setBillingPeriodEnd(e.target.value)} />
            <Input placeholder="Koszt brutto PLN" value={totalCostPln} onChange={(e) => setTotalCostPln(e.target.value)} />
            <div className="md:col-span-2">
              <Button type="submit" disabled={isSaving || !file}>
                {isSaving ? "Zapisywanie…" : "Zapisz fakturę"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {error ? <Card className="p-4 text-sm text-rose-300">{error}</Card> : null}

      {!invoices.length ? (
        <Card className="p-6 text-sm text-muted">Brak faktur energii dla tego sklepu.</Card>
      ) : (
        invoices.map((invoice) => (
          <Card key={invoice.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{invoice.documentTitle ?? "Faktura energii"}</p>
                <p className="text-sm text-muted">
                  {invoice.billingPeriodStart && invoice.billingPeriodEnd
                    ? `${invoice.billingPeriodStart} — ${invoice.billingPeriodEnd}`
                    : "Okres rozliczeniowy nieokreślony"}
                </p>
                <p className="mt-1 text-sm">
                  {invoice.totalKwh != null ? `${invoice.totalKwh} kWh` : "— kWh"}
                  {invoice.totalCostPln != null ? ` · ${invoice.totalCostPln.toFixed(2)} PLN` : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {invoice.documentUrl ? (
                  <a
                    href={invoice.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    Pobierz PDF
                  </a>
                ) : null}
                {canAnalyze ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void handleAnalyze(invoice.id)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Analizuj AI
                  </Button>
                ) : null}
              </div>
            </div>

            {invoice.analysis ? (
              <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface-muted/40 p-3 text-sm">
                <p>{invoice.analysis.summary}</p>
                {invoice.analysis.anomalies.length ? (
                  <div>
                    <p className="font-medium">Anomalie</p>
                    <ul className="list-disc pl-5 text-muted">
                      {invoice.analysis.anomalies.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {invoice.analysis.recommendations.length ? (
                  <div>
                    <p className="font-medium">Rekomendacje</p>
                    <ul className="list-disc pl-5 text-muted">
                      {invoice.analysis.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
