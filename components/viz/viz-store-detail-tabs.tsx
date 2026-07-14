"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  INSPECTION_STATUS_LABELS,
  type InspectionProtocolData,
  type InspectionRecord,
} from "@/lib/inspections/types";
import {
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeRecord,
} from "@/lib/service-intake/types";
import { VIZ_ALARM_CONDITION_LABELS } from "@/lib/viz/project-contact-types";
import { VIZ_SERVICE_CONTRACT_STATUS_LABELS } from "@/lib/viz/types";
import type { VizDashboardProject } from "@/lib/viz/types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";
import { VizProjectContactsPanel } from "@/components/viz/viz-project-contacts-panel";
import { VizSetpointControl } from "@/components/viz/viz-setpoint-control";
import { VizEnergyPanel } from "@/components/viz/viz-energy-panel";
import { VizControlHistoryPanel } from "@/components/viz/viz-control-history-panel";
import { VizStoreVariablesPanel } from "@/components/viz/viz-store-variables-panel";
import { VizStoreChartsPanel } from "@/components/viz/viz-store-charts-panel";
import { VizStoreSystemsPanel } from "@/components/viz/viz-store-systems-panel";
import type { VizDashboardPermissions } from "@/lib/viz/types";

const STORE_TABS = [
  "Podsumowanie",
  "Serwis",
  "Przeglądy",
  "Umowa serwisowa",
  "Kontakty",
  "Zmienne",
  "Wykresy",
  "Alarmy",
  "Energia",
  "Potencjał rozbudowy",
  "Historia sterowania",
] as const;

type StoreTab = (typeof STORE_TABS)[number];

type VizStoreDetailTabsProps = {
  dashboardId: string;
  project: VizDashboardProject | null;
};

export function VizStoreDetailTabs({ dashboardId, project }: VizStoreDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>("Podsumowanie");
  const [snapshot, setSnapshot] = useState<VizStoreLiveSnapshot | null>(null);
  const [permissions, setPermissions] = useState<VizDashboardPermissions | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(true);

  const projectId = project?.projectId ?? null;

  const loadLive = useCallback(async () => {
    if (!projectId) {
      setSnapshot(null);
      setIsLoadingLive(false);
      return;
    }

    setIsLoadingLive(true);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/live`);
      if (response.ok) {
        const data = (await response.json()) as { snapshots: VizStoreLiveSnapshot[] };
        setSnapshot(data.snapshots.find((item) => item.projectId === projectId) ?? null);
      }
    } finally {
      setIsLoadingLive(false);
    }
  }, [dashboardId, projectId]);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  useEffect(() => {
    async function loadSession() {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/session`);
      if (response.ok) {
        const data = (await response.json()) as {
          permissions: VizDashboardPermissions;
          canManage?: boolean;
        };
        setPermissions(data.permissions);
        setCanManage(data.canManage === true);
      }
    }
    void loadSession();
  }, [dashboardId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STORE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              activeTab === tab
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-surface-muted text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Podsumowanie" ? (
        <VizStoreSummaryTab
          project={project}
          snapshot={snapshot}
          isLoading={isLoadingLive}
          dashboardId={dashboardId}
          permissions={permissions}
          onSetpointSent={() => void loadLive()}
        />
      ) : activeTab === "Serwis" && projectId ? (
        <VizStoreServiceTab projectId={projectId} />
      ) : activeTab === "Przeglądy" && project ? (
        <VizStoreInspectionsTab projectId={project.projectId} clientId={project.clientId} />
      ) : activeTab === "Umowa serwisowa" ? (
        <VizStoreContractTab project={project} dashboardId={dashboardId} />
      ) : activeTab === "Kontakty" && projectId ? (
        <VizProjectContactsPanel dashboardId={dashboardId} projectId={projectId} />
      ) : activeTab === "Alarmy" ? (
        <VizStoreAlarmsTab snapshot={snapshot} isLoading={isLoadingLive} dashboardId={dashboardId} />
      ) : activeTab === "Energia" && projectId ? (
        <VizEnergyPanel
          dashboardId={dashboardId}
          projectId={projectId}
          canUpload={permissions?.uploadInvoices === true}
          canAnalyze={permissions?.analyzeInvoices === true}
        />
      ) : activeTab === "Historia sterowania" && projectId ? (
        <VizControlHistoryPanel dashboardId={dashboardId} projectId={projectId} />
      ) : activeTab === "Zmienne" && projectId ? (
        <VizStoreVariablesPanel
          dashboardId={dashboardId}
          projectId={projectId}
          snapshot={snapshot}
          isLoadingSnapshot={isLoadingLive}
        />
      ) : activeTab === "Wykresy" && projectId ? (
        <VizStoreChartsPanel dashboardId={dashboardId} projectId={projectId} />
      ) : activeTab === "Potencjał rozbudowy" && projectId ? (
        <VizStoreSystemsPanel
          dashboardId={dashboardId}
          projectId={projectId}
          canEdit={canManage}
        />
      ) : (
        <Card className="p-6 text-sm text-muted">
          <p className="font-medium text-foreground">{activeTab}</p>
          <p className="mt-2">
            Ta zakładka zostanie uzupełniona w kolejnych etapach wdrożenia modułu Wizualizacje.
          </p>
        </Card>
      )}
    </div>
  );
}

function VizStoreSummaryTab({
  project,
  snapshot,
  isLoading,
  dashboardId,
  permissions,
  onSetpointSent,
}: {
  project: VizDashboardProject | null;
  snapshot: VizStoreLiveSnapshot | null;
  isLoading: boolean;
  dashboardId: string;
  permissions: VizDashboardPermissions | null;
  onSetpointSent: () => void;
}) {
  if (!project) {
    return <Card className="p-6 text-sm text-muted">Nie znaleziono sklepu w tym dashboardzie.</Card>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Metadane sklepu</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Nazwa</dt>
            <dd>{project.displayName ?? project.projectName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Adres (klient)</dt>
            <dd className="text-right">{project.clientAddress ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Umowa (metadane)</dt>
            <dd>{VIZ_SERVICE_CONTRACT_STATUS_LABELS[project.serviceContractStatus]}</dd>
          </div>
        </dl>
        <Link
          href={`/wizualizacje/${dashboardId}/konfiguracja`}
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Edytuj w konfiguracji
        </Link>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Telemetria na żywo</h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ładowanie…
          </div>
        ) : !snapshot ? (
          <p className="text-sm text-muted">Brak danych telemetrii dla tego sklepu.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <Badge tone={snapshot.status.tone}>{snapshot.status.label}</Badge>
            {snapshot.workInProgress ? (
              <Badge tone="blue">Prowadzone prace (plan zasobów)</Badge>
            ) : null}
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Temperatura</dt>
                <dd>{snapshot.roles.store_temperature?.displayValue ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Setpoint</dt>
                <dd>{snapshot.roles.store_setpoint?.displayValue ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Otwarte zgłoszenia</dt>
                <dd>{snapshot.openServiceRequests > 0 ? snapshot.openServiceRequests : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Ostatni odczyt</dt>
                <dd>
                  {snapshot.lastReadAt
                    ? new Date(snapshot.lastReadAt).toLocaleString("pl-PL")
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Card>

      {project?.projectId ? (
        <div className="md:col-span-2">
          <VizSetpointControl
            dashboardId={dashboardId}
            projectId={project.projectId}
            currentValue={snapshot?.roles.store_setpoint?.displayValue ?? null}
            canControl={permissions?.controlSetpoint === true}
            onSuccess={onSetpointSent}
          />
        </div>
      ) : null}
    </div>
  );
}

function VizStoreContractTab({
  project,
  dashboardId,
}: {
  project: VizDashboardProject | null;
  dashboardId: string;
}) {
  if (!project) {
    return null;
  }

  return (
    <Card className="p-6 text-sm">
      <p className="font-medium">Status umowy (metadane projektu w dashboardzie)</p>
      <p className="mt-2 text-2xl font-semibold">
        {VIZ_SERVICE_CONTRACT_STATUS_LABELS[project.serviceContractStatus]}
      </p>
      <Link
        href={`/wizualizacje/${dashboardId}/umowy`}
        className="mt-4 inline-block text-accent hover:underline"
      >
        Przejdź do modułu umów serwisowych
      </Link>
    </Card>
  );
}

function VizStoreAlarmsTab({
  snapshot,
  isLoading,
  dashboardId,
}: {
  snapshot: VizStoreLiveSnapshot | null;
  isLoading: boolean;
  dashboardId: string;
}) {
  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie alarmów…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Aktywne reguły dashboardu</h3>
        {!snapshot?.activeAlarms?.length ? (
          <p className="text-sm text-muted">
            Brak aktywnych reguł progów dla tego sklepu. Alarmy z telemetrii Loxone nadal mogą
            wpływać na status.
          </p>
        ) : (
          <div className="space-y-2">
            {snapshot.activeAlarms.map((alarm) => (
              <div
                key={alarm.ruleId}
                className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {alarm.ruleName} · {alarm.severity === "alarm" ? "Alarm" : "Ostrzeżenie"}
                </p>
                <p className="text-muted">
                  {alarm.roleCode}: {alarm.numericValue}{" "}
                  {VIZ_ALARM_CONDITION_LABELS[alarm.condition]} {alarm.thresholdNumeric}
                </p>
              </div>
            ))}
          </div>
        )}
        <Link
          href={`/wizualizacje/${dashboardId}/konfiguracja`}
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Konfiguruj reguły alarmów
        </Link>
      </Card>
    </div>
  );
}

function VizStoreServiceTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ServiceIntakeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/service-intakes`);
        if (!response.ok) {
          throw new Error("Nie udało się pobrać zgłoszeń serwisowych.");
        }
        const data = (await response.json()) as { items: ServiceIntakeRecord[] };
        setItems(data.items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [projectId]);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie zgłoszeń…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!items.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Brak zgłoszeń serwisowych powiązanych z tym projektem.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Numer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Opis</th>
              <th className="px-4 py-3 font-medium">Utworzono</th>
              <th className="px-4 py-3 font-medium">Termin</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium">{item.referenceNumber}</td>
                <td className="px-4 py-3">{SERVICE_INTAKE_STATUS_LABELS[item.status]}</td>
                <td className="max-w-xs truncate px-4 py-3 text-muted">{item.description}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(item.createdAt).toLocaleString("pl-PL")}
                </td>
                <td className="px-4 py-3 text-muted">
                  {item.dueAt ? new Date(item.dueAt).toLocaleString("pl-PL") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function VizStoreInspectionsTab({
  projectId,
  clientId,
}: {
  projectId: string;
  clientId: string | null;
}) {
  const [items, setItems] = useState<InspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const params = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
        const response = await fetch(`/api/inspections${params}`);
        if (!response.ok) {
          throw new Error("Nie udało się pobrać przeglądów.");
        }
        const data = (await response.json()) as { items: InspectionRecord[] };
        setItems(data.items.filter((item) => item.projectId === projectId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [projectId, clientId]);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie przeglądów…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!items.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Brak przeglądów przypisanych do tego projektu.{" "}
        <Link href="/przeglady" className="text-accent hover:underline">
          Przejdź do modułu Przeglądy
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm text-muted">
        Przeglądy z istniejącego modułu — filtrowane po projekcie sklepu.
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Data wstępna</th>
              <th className="px-4 py-3 font-medium">Data planowana</th>
              <th className="px-4 py-3 font-medium">Notatki</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="px-4 py-3">{INSPECTION_STATUS_LABELS[item.status]}</td>
                <td className="px-4 py-3 text-muted">
                  {item.preliminaryDate
                    ? new Date(item.preliminaryDate).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {item.confirmedDate
                    ? new Date(item.confirmedDate).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-muted">
                  {(item.protocolData as InspectionProtocolData)?.notes ?? item.title}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
