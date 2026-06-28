"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, ChevronDown, ExternalLink, FileText, Plus } from "lucide-react";
import { ClientOfferPage } from "@/components/service/client-offer-page";
import { Button } from "@/components/ui/button";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import {
  buildClientOfferSummaries,
  getClientOfferSummaryTone,
  type ClientOfferSummary,
} from "@/lib/dashboard/client-offer-summary";
import {
  serviceOfferListBadge,
  serviceOfferListCardClassName,
} from "@/lib/service/client-offer-history";
import { fetchServicesByClientId } from "@/lib/supabase/service-repository";
import { cn, formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useServiceStore } from "@/store/service-store";

function OfferListItem({
  entry,
  expanded,
  onToggle,
  mode,
}: {
  entry: ClientOfferSummary;
  expanded: boolean;
  onToggle: () => void;
  mode: "team" | "client";
}) {
  const tone = getClientOfferSummaryTone(entry);
  const badge = serviceOfferListBadge(tone);

  return (
    <div className={cn("overflow-hidden rounded-xl border", serviceOfferListCardClassName(tone))}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{entry.title}</p>
            {badge ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {entry.isSettlement ? "Rozliczenie serwisu" : "Wycena / oferta serwisowa"}
            {" · "}
            {entry.serviceType}
            {entry.projectName ? ` · ${entry.projectName}` : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Status: {entry.serviceStatus}
            {entry.offerStatusLabel ? ` · ${entry.offerStatusLabel}` : ""}
            {" · "}
            {formatDate(entry.updatedAt)}
          </p>
        </div>
        <ChevronDown
          className={cn("mt-1 h-4 w-4 shrink-0 text-muted transition", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/60 px-4 py-4">
          {mode === "team" ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" asChild>
                <Link href={`/oferty/${entry.id}`}>
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Otwórz w module ofert
                </Link>
              </Button>
              {entry.offerToken ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href={`/oferta/${entry.offerToken}`} target="_blank" rel="noopener noreferrer">
                    Podgląd linku klienta
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {mode === "client" && entry.offerToken ? (
            <ClientOfferPage token={entry.offerToken} />
          ) : mode === "client" ? (
            <p className="text-sm text-muted">Oferta nie została jeszcze udostępniona klientowi.</p>
          ) : (
            <p className="text-sm text-muted">
              Pełna edycja, generowanie linku i wysyłka oferty — w module{" "}
              <Link href={`/oferty/${entry.id}`} className="text-accent hover:underline">
                rozliczeń serwisu
              </Link>
              .
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ClientOffersPanel({
  clientId,
  projectId,
  mode,
  seedOffers,
}: {
  clientId: string;
  projectId: string;
  mode: "team" | "client";
  seedOffers?: ClientOfferSummary[];
}) {
  const projects = useAppStore((state) => state.projects);
  const storeServices = useServiceStore((state) => state.services);
  const hydrateServices = useServiceStore((state) => state.hydrate);

  const [remoteServices, setRemoteServices] = useState<typeof storeServices | null>(null);
  const [loading, setLoading] = useState(mode === "team");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const loadTeamOffers = useCallback(async () => {
    if (mode !== "team") {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await hydrateServices();
      const fetched = await fetchServicesByClientId(clientId);
      setRemoteServices(fetched);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać ofert.");
    } finally {
      setLoading(false);
    }
  }, [clientId, hydrateServices, mode]);

  useEffect(() => {
    void loadTeamOffers();
  }, [loadTeamOffers]);

  const servicesSource =
    mode === "client"
      ? null
      : remoteServices ??
        storeServices.filter((service) => service.clientId === clientId);

  const summaries = useMemo(() => {
    if (mode === "client" && seedOffers) {
      return seedOffers.filter((entry) =>
        showAllProjects || !projectId ? true : entry.projectId === projectId || !entry.projectId,
      );
    }

    if (!servicesSource) {
      return [];
    }

    return buildClientOfferSummaries(servicesSource, projectNames, {
      projectId: showAllProjects ? undefined : projectId,
    });
  }, [mode, projectId, projectNames, seedOffers, servicesSource, showAllProjects]);

  const newOfferHref = `/oferty/nowy?clientId=${encodeURIComponent(clientId)}&projectId=${encodeURIComponent(projectId)}`;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Oferty i rozliczenia</h2>
          <p className="text-sm text-muted">
            Rozliczenia serwisu oraz kalkulacje dla tego klienta.
          </p>
        </div>
        {mode === "team" ? (
          <Button type="button" size="sm" className="w-full sm:w-auto" asChild>
            <Link href={newOfferHref}>
              <Plus className="mr-2 h-4 w-4" />
              Nowa kalkulacja / oferta
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/80 bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-accent" />
            {COMMERCIAL_MODULES.serviceSettlement.label}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={showAllProjects}
              onChange={(event) => setShowAllProjects(event.target.checked)}
            />
            Pokaż także inne projekty klienta
          </label>
        </div>

        {loading ? <p className="text-sm text-muted">Ładowanie ofert…</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {!loading && !error && summaries.length === 0 ? (
          <p className="text-sm text-muted">
            {mode === "client"
              ? "Brak udostępnionych ofert lub rozliczeń dla tego klienta."
              : "Brak ofert serwisowych. Utwórz nową kalkulację i wyślij link klientowi."}
          </p>
        ) : null}

        <div className="grid gap-2">
          {summaries.map((entry) => (
            <OfferListItem
              key={entry.id}
              entry={entry}
              mode={mode}
              expanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId((current) => (current === entry.id ? null : entry.id))
              }
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border/80 bg-surface-muted/15 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calculator className="h-4 w-4 text-accent" />
          {COMMERCIAL_MODULES.salesCalculations.label}
        </p>
        <p className="mt-1 text-sm text-muted">{COMMERCIAL_MODULES.salesCalculations.description}</p>
        {mode === "team" && COMMERCIAL_MODULES.salesCalculations.available ? (
          <Button type="button" size="sm" variant="outline" className="mt-3" asChild>
            <Link href={COMMERCIAL_MODULES.salesCalculations.href}>Przejdź do kalkulacji</Link>
          </Button>
        ) : mode === "team" ? (
          <p className="mt-2 text-xs text-muted">Moduł będzie dostępny w kolejnej wersji aplikacji.</p>
        ) : null}
      </div>
    </div>
  );
}
