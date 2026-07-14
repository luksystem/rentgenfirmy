"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import type { ServiceRates, KilometerZoneSettings } from "@/lib/service/types";
import type {
  VizDashboardHoursSummary,
  VizServiceContract,
} from "@/lib/viz/contract-types";
import {
  VIZ_SERVICE_CONTRACT_STATUSES,
  VIZ_SERVICE_CONTRACT_STATUS_LABELS,
  type VizDashboardProject,
  type VizServiceContractStatus,
} from "@/lib/viz/types";

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

type VizContractsPanelProps = {
  dashboardId: string;
};

export function VizContractsPanel({ dashboardId }: VizContractsPanelProps) {
  const [contracts, setContracts] = useState<VizServiceContract[]>([]);
  const [projects, setProjects] = useState<VizDashboardProject[]>([]);
  const [hoursSummary, setHoursSummary] = useState<VizDashboardHoursSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ratesContractId, setRatesContractId] = useState<string | null>(null);
  const [ratesDraft, setRatesDraft] = useState<ServiceRates>(DEFAULT_SERVICE_SETTINGS.rates);
  const [zonesDraft, setZonesDraft] = useState<KilometerZoneSettings>(
    DEFAULT_SERVICE_SETTINGS.zoneSettings,
  );

  const [name, setName] = useState("");
  const [contractType, setContractType] = useState<VizServiceContractStatus>("mixed");
  const [monthlyHoursBudget, setMonthlyHoursBudget] = useState("");
  const [slaResponseHours, setSlaResponseHours] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contractsRes, hoursRes, projectsRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/contracts`),
        fetch(`/api/viz/dashboards/${dashboardId}/contracts?hours=1`),
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=projects`),
      ]);

      if (!contractsRes.ok || !hoursRes.ok) {
        throw new Error("Nie udało się pobrać danych umów.");
      }

      const contractsData = (await contractsRes.json()) as { contracts: VizServiceContract[] };
      const hoursData = (await hoursRes.json()) as { summary: VizDashboardHoursSummary };
      const projectsData = projectsRes.ok
        ? ((await projectsRes.json()) as { projects: VizDashboardProject[] })
        : { projects: [] };

      setContracts(contractsData.contracts);
      setHoursSummary(hoursData.summary);
      setProjects(projectsData.projects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "contract",
          name: name.trim(),
          contractType,
          monthlyHoursBudget: monthlyHoursBudget ? Number(monthlyHoursBudget) : null,
          slaResponseHours: slaResponseHours ? Number(slaResponseHours) : null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się utworzyć umowy.");
      }

      setName("");
      setMonthlyHoursBudget("");
      setSlaResponseHours("");
      setMessage("Umowa została dodana.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(contractId: string) {
    if (!window.confirm("Usunąć tę umowę wraz ze stawkami?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/contracts?id=${encodeURIComponent(contractId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć umowy.");
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    }
  }

  async function handleSaveRates(contractId: string) {
    setIsSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "rateVersion",
          contractId,
          versionLabel: `Stawki ${today}`,
          validFrom: today,
          rates: ratesDraft,
          zoneSettings: zonesDraft,
        }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zapisać stawek.");
      }

      setRatesContractId(null);
      setMessage("Zapisano nową wersję stawek umowy.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu stawek.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignAllProjects(contractId: string) {
    if (!projects.length) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      for (const project of projects) {
        const response = await fetch(`/api/viz/dashboards/${dashboardId}/contracts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "projectTerm",
            contractId,
            projectId: project.projectId,
          }),
        });
        if (!response.ok) {
          throw new Error("Nie udało się przypisać sklepów do umowy.");
        }
      }
      setMessage(`Przypisano umowę do ${projects.length} sklepów.`);
      await loadData();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Błąd przypisania sklepów.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddDefaultRates(contractId: string) {
    setRatesContractId(contractId);
    setRatesDraft({ ...DEFAULT_SERVICE_SETTINGS.rates });
    setZonesDraft({ ...DEFAULT_SERVICE_SETTINGS.zoneSettings });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie umów…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 text-sm text-muted">
        <p className="font-medium text-foreground">Gdzie definiować stawki?</p>
        <p className="mt-2">
          Stawki serwisowe (PLN/h, PLN/km, strefy dojazdu) dodajesz tutaj jako <strong>wersje stawek</strong>{" "}
          przypisane do umowy sieciowej. Możesz skopiować wartości z globalnych ustawień Szybkich ofert
          i je edytować przed zapisem. Sklepy widzą aktualne stawki w zakładce „Umowa serwisowa”.
        </p>
      </Card>

      {hoursSummary ? (
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold">Godziny pracy w bieżącym miesiącu</h2>
          <p className="text-sm text-muted">
            Okres: {hoursSummary.periodStart} — {hoursSummary.periodEnd}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Razem</p>
              <p className="text-2xl font-semibold tabular-nums">{hoursSummary.totalHours} h</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Rozliczalne</p>
              <p className="text-2xl font-semibold tabular-nums">{hoursSummary.billableHours} h</p>
            </div>
          </div>
          {hoursSummary.projects.some((project) => project.billableHours > 0) ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-3 py-2 font-medium">Sklep</th>
                    <th className="px-3 py-2 font-medium">Rozliczalne</th>
                    <th className="px-3 py-2 font-medium">Razem</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursSummary.projects
                    .filter((project) => project.totalHours > 0)
                    .map((project) => (
                      <tr key={project.projectId} className="border-b border-border/60">
                        <td className="px-3 py-3">{project.projectLabel}</td>
                        <td className="px-3 py-3 tabular-nums">{project.billableHours} h</td>
                        <td className="px-3 py-3 tabular-nums text-muted">{project.totalHours} h</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Brak wpisów czasu pracy w tym okresie.</p>
          )}
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Nowa umowa sieciowa</h2>
        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Nazwa umowy</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Typ</label>
            <select
              className={selectClassName}
              value={contractType}
              onChange={(e) => setContractType(e.target.value as VizServiceContractStatus)}
            >
              {VIZ_SERVICE_CONTRACT_STATUSES.filter((status) => status !== "none").map((status) => (
                <option key={status} value={status}>
                  {VIZ_SERVICE_CONTRACT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Budżet godzin / miesiąc</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={monthlyHoursBudget}
              onChange={(e) => setMonthlyHoursBudget(e.target.value)}
              placeholder="np. 40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">SLA reakcji (h)</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={slaResponseHours}
              onChange={(e) => setSlaResponseHours(e.target.value)}
              placeholder="np. 24"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Dodaj umowę
            </Button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      <div className="space-y-4">
        <h2 className="text-base font-semibold">Umowy ({contracts.length})</h2>
        {!contracts.length ? (
          <Card className="p-6 text-sm text-muted">Brak umów — dodaj pierwszą powyżej.</Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{contract.name}</p>
                  <p className="text-sm text-muted">
                    {VIZ_SERVICE_CONTRACT_STATUS_LABELS[contract.contractType]}
                    {contract.monthlyHoursBudget != null
                      ? ` · ${contract.monthlyHoursBudget} h/mies.`
                      : ""}
                    {contract.slaResponseHours != null
                      ? ` · SLA ${contract.slaResponseHours} h`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSaving}
                    onClick={() => handleAddDefaultRates(contract.id)}
                  >
                    {ratesContractId === contract.id ? "Edytujesz stawki…" : "Nowa wersja stawek"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSaving || !projects.length}
                    onClick={() => void handleAssignAllProjects(contract.id)}
                  >
                    Przypisz wszystkie sklepy ({projects.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleDelete(contract.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="mt-2 text-sm text-muted">
                Przypisane sklepy: {contract.projectTerms.length || "cała sieć (brak jawnych terminów)"}
              </p>

              {ratesContractId === contract.id ? (
                <div className="mt-4 grid gap-3 rounded-xl border border-border bg-surface-muted/30 p-4 md:grid-cols-2">
                  <RateField
                    label="Kierownik PLN/h"
                    value={ratesDraft.supervisionHourly}
                    onChange={(value) =>
                      setRatesDraft((current) => ({ ...current, supervisionHourly: value }))
                    }
                  />
                  <RateField
                    label="Monter PLN/h"
                    value={ratesDraft.installerHourly}
                    onChange={(value) =>
                      setRatesDraft((current) => ({ ...current, installerHourly: value }))
                    }
                  />
                  <RateField
                    label="Pomocnik PLN/h"
                    value={ratesDraft.helperHourly}
                    onChange={(value) =>
                      setRatesDraft((current) => ({ ...current, helperHourly: value }))
                    }
                  />
                  <RateField
                    label="Programista PLN/h"
                    value={ratesDraft.programmerHourly}
                    onChange={(value) =>
                      setRatesDraft((current) => ({ ...current, programmerHourly: value }))
                    }
                  />
                  <RateField
                    label="Auto PLN/km"
                    value={ratesDraft.carPerKm}
                    onChange={(value) => setRatesDraft((current) => ({ ...current, carPerKm: value }))}
                  />
                  <RateField
                    label="Auto PLN/h"
                    value={ratesDraft.carHourly}
                    onChange={(value) =>
                      setRatesDraft((current) => ({ ...current, carHourly: value }))
                    }
                  />
                  <RateField
                    label="Nocleg PLN"
                    value={ratesDraft.accommodationCost}
                    onChange={(value) =>
                      setRatesDraft((current) => ({ ...current, accommodationCost: value }))
                    }
                  />
                  <RateField
                    label="Strefa 1 km"
                    value={zonesDraft.zone1ThresholdKm}
                    onChange={(value) =>
                      setZonesDraft((current) => ({ ...current, zone1ThresholdKm: value }))
                    }
                  />
                  <RateField
                    label="Strefa 2 km"
                    value={zonesDraft.zone2ThresholdKm}
                    onChange={(value) =>
                      setZonesDraft((current) => ({ ...current, zone2ThresholdKm: value }))
                    }
                  />
                  <RateField
                    label="Strefa 3 km"
                    value={zonesDraft.zone3ThresholdKm}
                    onChange={(value) =>
                      setZonesDraft((current) => ({ ...current, zone3ThresholdKm: value }))
                    }
                  />
                  <div className="md:col-span-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => void handleSaveRates(contract.id)}
                    >
                      Zapisz wersję stawek
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setRatesContractId(null)}
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              ) : null}

              {contract.rateVersions.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Wersje stawek</p>
                  {contract.rateVersions.map((version) => (
                    <div
                      key={version.id}
                      className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{version.versionLabel}</p>
                      <p className="text-muted">
                        Od {version.validFrom}
                        {version.validUntil ? ` do ${version.validUntil}` : ""} · km:{" "}
                        {version.rates.carPerKm} PLN · auto/h: {version.rates.carHourly} PLN
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Brak wersji stawek — kliknij „Nowa wersja stawek”, aby zdefiniować cennik serwisu.
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function RateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <Input
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
