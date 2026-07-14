"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type {
  VizDashboardHoursSummary,
  VizServiceContract,
} from "@/lib/viz/contract-types";
import { pickCurrentRateVersion } from "@/lib/viz/contract-display";
import {
  VIZ_SERVICE_CONTRACT_STATUS_LABELS,
  type VizDashboardProject,
} from "@/lib/viz/types";

type VizStoreContractPanelProps = {
  dashboardId: string;
  projectId: string;
  project: VizDashboardProject | null;
};

export function VizStoreContractPanel({
  dashboardId,
  projectId,
  project,
}: VizStoreContractPanelProps) {
  const [contracts, setContracts] = useState<VizServiceContract[]>([]);
  const [hoursSummary, setHoursSummary] = useState<VizDashboardHoursSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contractsRes, hoursRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/contracts`),
        fetch(`/api/viz/dashboards/${dashboardId}/contracts?hours=1`),
      ]);

      if (!contractsRes.ok) {
        throw new Error("Nie udało się pobrać umów serwisowych.");
      }

      const contractsData = (await contractsRes.json()) as { contracts: VizServiceContract[] };
      setContracts(contractsData.contracts ?? []);

      if (hoursRes.ok) {
        const hoursData = (await hoursRes.json()) as { summary: VizDashboardHoursSummary };
        setHoursSummary(hoursData.summary);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const projectHours = useMemo(
    () => hoursSummary?.projects.find((item) => item.projectId === projectId) ?? null,
    [hoursSummary, projectId],
  );

  const relevantContracts = useMemo(() => {
    return contracts.filter((contract) => {
      if (!contract.isActive) {
        return false;
      }
      if (!contract.projectTerms.length) {
        return true;
      }
      return contract.projectTerms.some((term) => term.projectId === projectId);
    });
  }, [contracts, projectId]);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie umowy serwisowej…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold">Status sklepu w dashboardzie</h3>
        <p className="mt-2 text-2xl font-semibold">
          {project
            ? VIZ_SERVICE_CONTRACT_STATUS_LABELS[project.serviceContractStatus]
            : "—"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Metadane projektu w dashboardzie (niezależne od umowy sieciowej poniżej).
        </p>
      </Card>

      {projectHours ? (
        <Card className="p-5">
          <h3 className="font-semibold">Godziny w bieżącym miesiącu</h3>
          <p className="mt-1 text-sm text-muted">
            {hoursSummary?.periodStart} — {hoursSummary?.periodEnd}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Rozliczalne</p>
              <p className="text-2xl font-semibold tabular-nums">{projectHours.billableHours} h</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Razem</p>
              <p className="text-2xl font-semibold tabular-nums">{projectHours.totalHours} h</p>
            </div>
          </div>
        </Card>
      ) : null}

      {!relevantContracts.length ? (
        <Card className="p-6 text-sm text-muted">
          Brak aktywnej umowy sieciowej przypisanej do tego sklepu.{" "}
          <Link href={`/wizualizacje/${dashboardId}/umowy`} className="text-accent hover:underline">
            Dodaj umowę i stawki w module umów
          </Link>
        </Card>
      ) : (
        relevantContracts.map((contract) => {
          const projectTerm = contract.projectTerms.find((term) => term.projectId === projectId);
          const currentRates = pickCurrentRateVersion(contract.rateVersions);

          return (
            <Card key={contract.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{contract.name}</h3>
                  <p className="text-sm text-muted">
                    {VIZ_SERVICE_CONTRACT_STATUS_LABELS[contract.contractType]}
                    {contract.monthlyHoursBudget != null
                      ? ` · budżet ${contract.monthlyHoursBudget} h/mies.`
                      : ""}
                    {contract.slaResponseHours != null
                      ? ` · SLA ${contract.slaResponseHours} h`
                      : ""}
                  </p>
                </div>
                <Link
                  href={`/wizualizacje/${dashboardId}/umowy`}
                  className="text-sm text-accent hover:underline"
                >
                  Edytuj umowę i stawki
                </Link>
              </div>

              {projectTerm ? (
                <div className="mt-4 rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">Warunki dla tego sklepu</p>
                  {projectTerm.monthlyHoursOverride != null ? (
                    <p className="text-muted">
                      Budżet sklepu: {projectTerm.monthlyHoursOverride} h/mies.
                    </p>
                  ) : null}
                  {projectTerm.contractStatusOverride ? (
                    <p className="text-muted">
                      Status:{" "}
                      {VIZ_SERVICE_CONTRACT_STATUS_LABELS[projectTerm.contractStatusOverride]}
                    </p>
                  ) : null}
                  {projectTerm.notes ? <p className="text-muted">{projectTerm.notes}</p> : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Umowa obejmuje całą sieć — brak osobnych warunków dla tego sklepu.
                </p>
              )}

              {currentRates ? (
                <div className="mt-4 rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">Aktualne stawki ({currentRates.versionLabel})</p>
                  <p className="mt-1 text-muted">
                    Kierownik: {currentRates.rates.supervisionHourly} PLN/h · Monter:{" "}
                    {currentRates.rates.installerHourly} PLN/h · Programista:{" "}
                    {currentRates.rates.programmerHourly} PLN/h
                  </p>
                  <p className="text-muted">
                    Auto: {currentRates.rates.carPerKm} PLN/km · {currentRates.rates.carHourly}{" "}
                    PLN/h · Nocleg: {currentRates.rates.accommodationCost} PLN
                  </p>
                  <p className="text-muted">
                    Strefy km: {currentRates.zoneSettings.zone1ThresholdKm} /{" "}
                    {currentRates.zoneSettings.zone2ThresholdKm} /{" "}
                    {currentRates.zoneSettings.zone3ThresholdKm}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-amber-300">
                  Brak wersji stawek — dodaj je w{" "}
                  <Link
                    href={`/wizualizacje/${dashboardId}/umowy`}
                    className="text-accent hover:underline"
                  >
                    module umów
                  </Link>
                  .
                </p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
