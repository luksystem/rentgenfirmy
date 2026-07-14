"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VizTravelCalcResult, VizTravelCalcSnapshot } from "@/lib/viz/contract-types";
import type { VizDashboardProject } from "@/lib/viz/types";

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

type VizTravelCalculatorProps = {
  dashboardId: string;
};

export function VizTravelCalculator({ dashboardId }: VizTravelCalculatorProps) {
  const [projects, setProjects] = useState<VizDashboardProject[]>([]);
  const [snapshots, setSnapshots] = useState<VizTravelCalcSnapshot[]>([]);
  const [result, setResult] = useState<VizTravelCalcResult | null>(null);
  const [projectId, setProjectId] = useState("");
  const [tripCount, setTripCount] = useState("1");
  const [carHours, setCarHours] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectsRes, snapshotsRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=projects`),
        fetch(`/api/viz/dashboards/${dashboardId}/travel`),
      ]);

      if (!projectsRes.ok || !snapshotsRes.ok) {
        throw new Error("Nie udało się pobrać danych kalkulatora.");
      }

      const projectsData = (await projectsRes.json()) as { projects: VizDashboardProject[] };
      const snapshotsData = (await snapshotsRes.json()) as { snapshots: VizTravelCalcSnapshot[] };

      setProjects(projectsData.projects);
      setSnapshots(snapshotsData.snapshots);
      setProjectId((current) => {
        if (current && projectsData.projects.some((project) => project.projectId === current)) {
          return current;
        }
        return projectsData.projects[0]?.projectId ?? "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCalculate(saveSnapshot = false) {
    if (!projectId) {
      setError("Wybierz sklep.");
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/travel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          tripCount: Number(tripCount) || 1,
          carHours: carHours ? Number(carHours) : 0,
          saveSnapshot,
          label: snapshotLabel.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się policzyć dojazdu.");
      }

      const data = (await response.json()) as { result: VizTravelCalcResult };
      setResult(data.result);
      if (saveSnapshot) {
        setSnapshotLabel("");
        await loadData();
      }
    } catch (calcError) {
      setError(calcError instanceof Error ? calcError.message : "Błąd kalkulacji.");
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleDeleteSnapshot(snapshotId: string) {
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/travel?id=${encodeURIComponent(snapshotId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć snapshotu.");
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie kalkulatora…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Kalkulator dojazdu serwisowego</h2>
        <p className="mb-4 text-sm text-muted">
          Niezależny moduł dashboardu — ten sam algorytm co Szybkie oferty, ale lokalizacja docelowa
          pochodzi z klienta projektu. Stawki z ustawień globalnych serwisu.
        </p>

        {!projects.length ? (
          <p className="text-sm text-muted">Najpierw przypisz sklepy do dashboardu.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sklep docelowy</label>
              <select
                className={selectClassName}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.displayName ?? project.projectName ?? project.projectId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Liczba wyjazdów</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={tripCount}
                onChange={(e) => setTripCount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Godziny auta / wyjazd</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={carHours}
                onChange={(e) => setCarHours(e.target.value)}
                placeholder="Puste = ze strefy km"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Etykieta snapshotu (opcjonalnie)</label>
              <Input
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="np. Wizyta awaryjna 03/2026"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isCalculating}
                onClick={() => void handleCalculate(false)}
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                Oblicz
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isCalculating}
                onClick={() => void handleCalculate(true)}
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Oblicz i zapisz snapshot
              </Button>
            </div>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      {result ? (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Wynik: {result.projectLabel}</h3>
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted">Baza firmy</dt>
              <dd>{result.companyAddress}</dd>
            </div>
            <div>
              <dt className="text-muted">Adres klienta</dt>
              <dd>{result.clientAddress}</dd>
            </div>
            <div>
              <dt className="text-muted">Odległość (1 kierunek)</dt>
              <dd>{result.oneWayKm.toFixed(1)} km · strefa {result.zone}</dd>
            </div>
            <div>
              <dt className="text-muted">Wyjazdy</dt>
              <dd>{result.tripCount}</dd>
            </div>
            <div>
              <dt className="text-muted">Koszt km</dt>
              <dd>{result.carKmCost.toFixed(2)} PLN</dd>
            </div>
            <div>
              <dt className="text-muted">Koszt godzin auta</dt>
              <dd>{result.carHoursCost.toFixed(2)} PLN</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted">Razem dojazd</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {result.totalTravelCost.toFixed(2)} PLN
              </dd>
            </div>
          </dl>
          {result.geocodeNote ? (
            <p className="mt-3 text-xs text-muted">{result.geocodeNote}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Zapisane snapshoty ({snapshots.length})</h3>
        {!snapshots.length ? (
          <Card className="p-6 text-sm text-muted">Brak zapisanych kalkulacji.</Card>
        ) : (
          snapshots.map((snapshot) => (
            <Card key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <p className="font-medium">
                  {snapshot.label ?? snapshot.projectLabel} · {snapshot.totalTravelCost.toFixed(2)} PLN
                </p>
                <p className="text-muted">
                  {snapshot.oneWayKm.toFixed(1)} km · {snapshot.tripCount} wyjazd(ów) ·{" "}
                  {new Date(snapshot.createdAt).toLocaleString("pl-PL")} · {snapshot.createdByName}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleDeleteSnapshot(snapshot.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
