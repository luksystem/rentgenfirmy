"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCheck, LayoutGrid, Rows3, Wrench } from "lucide-react";
import { DeploymentHubBoardTile } from "@/components/kanban-hub/deployment-hub-board-tiles";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgreementsHubRealtime } from "@/hooks/use-agreements-hub-realtime";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";
import { useProcessStore } from "@/store/process-store";

const REFRESH_INTERVAL_MS = 30000;

export default function KanbanHubPage() {
  const hubClients = useKanbanCacheStore((state) => state.hubClients);
  const hubLoading = useKanbanCacheStore((state) => state.hubLoading);
  const hydrateHub = useKanbanCacheStore((state) => state.hydrateHub);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const agreementPendingCounts = useAgreementHubStore((state) => state.pendingCounts);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);

  const [error, setError] = useState<string | null>(null);
  const [serviceNewCount, setServiceNewCount] = useState(0);
  const [serviceOverdueCount, setServiceOverdueCount] = useState(0);
  const [serviceActiveCount, setServiceActiveCount] = useState(0);

  const loading = hubLoading && !hubClients;

  const refreshServiceCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/service-intake/counts", { credentials: "include" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        activeCount?: number;
        newCount?: number;
        overdueCount?: number;
      };
      setServiceOverdueCount(payload.overdueCount ?? 0);
      setServiceNewCount(payload.newCount ?? 0);
      setServiceActiveCount(payload.activeCount ?? 0);
    } catch {
      setServiceOverdueCount(0);
      setServiceNewCount(0);
      setServiceActiveCount(0);
    }
  }, []);

  const reloadHub = useCallback(async (force = false) => {
    setError(null);
    try {
      await Promise.all([
        hydrateHub({ force }),
        refreshKanbanNewTaskCount(),
        refreshKanbanOverdueTaskCount(),
        refreshAgreementPendingCounts({ force }),
        refreshServiceCounts(),
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablic.");
    }
  }, [
    hydrateHub,
    refreshAgreementPendingCounts,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    refreshServiceCounts,
  ]);

  const reloadHubRef = useRef(reloadHub);
  reloadHubRef.current = reloadHub;

  useEffect(() => {
    void reloadHubRef.current(false);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void reloadHubRef.current(true);
      }
    };
    const interval = window.setInterval(tick, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const handleAgreementsRealtime = useCallback(() => {
    void refreshAgreementPendingCounts({ force: true }).catch(() => undefined);
  }, [refreshAgreementPendingCounts]);

  useAgreementsHubRealtime(handleAgreementsRealtime);

  const clients = hubClients ?? [];
  const totalOpen = clients.reduce((sum, client) => sum + client.openTaskCount, 0);
  const agreementsPendingCount = agreementPendingCounts?.pendingAgreements ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Kanban"
        title="Tablice wdrożeń"
        description="Tablice Kanban z procesów projektów oraz zbiorczy widok ustaleń u klientów."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <DeploymentHubBoardTile
          href="/tablice-wdrozen/zbiorcza"
          title="Tablica wdrożeń"
          description={
            totalOpen > 0
              ? `${totalOpen} otwartych zgłoszeń we wszystkich projektach`
              : "Zbiorczy widok zadań wdrożeniowych z procesów"
          }
          icon={Rows3}
          newCount={kanbanNewTaskCount}
          overdueCount={kanbanOverdueTaskCount}
        />
        <DeploymentHubBoardTile
          href="/tablice-wdrozen/serwis"
          title="Tablica serwisowa"
          description={
            serviceActiveCount > 0
              ? `${serviceActiveCount} aktywnych zgłoszeń serwisowych`
              : "Zgłoszenia serwisowe od klientów — CAFE i SLA"
          }
          icon={Wrench}
          newCount={serviceNewCount}
          overdueCount={serviceOverdueCount}
        />
        <DeploymentHubBoardTile
          href="/tablice-wdrozen/ustalenia"
          title="Tablica ustaleń"
          description={
            agreementsPendingCount > 0
              ? `${agreementsPendingCount} ustaleń czeka na akceptację`
              : "Ustalenia projektowe u klientów — szkice i akceptacje"
          }
          icon={ClipboardCheck}
          pendingCount={agreementsPendingCount}
        />
      </section>

      {loading ? (
        <p className="text-sm text-muted">Ładowanie tablic…</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted">
            Brak tablic Kanban powiązanych z projektami. Dodaj element Kanban w szablonie procesu i
            uruchom proces na projekcie.
          </CardContent>
        </Card>
      ) : null}

      {clients.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.clientId} href={`/tablice-wdrozen/${client.clientId}`}>
              <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span className="line-clamp-2">{client.clientName}</span>
                    <LayoutGrid className="h-4 w-4 shrink-0 text-accent" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-muted">
                  <p>
                    {client.projectCount}{" "}
                    {client.projectCount === 1
                      ? "projekt"
                      : client.projectCount < 5
                        ? "projekty"
                        : "projektów"}
                    {" · "}
                    {client.boardCount}{" "}
                    {client.boardCount === 1 ? "tablica" : client.boardCount < 5 ? "tablice" : "tablic"}
                  </p>
                  <p className="font-medium text-foreground">
                    {client.openTaskCount} otwartych zgłoszeń
                    {client.newTaskCount > 0 ? (
                      <span className="ml-2 inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {client.newTaskCount} nowe
                      </span>
                    ) : null}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
