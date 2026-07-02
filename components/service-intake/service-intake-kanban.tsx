"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS,
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeRecord,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import { CAFE_PRIORITY_OPTIONS } from "@/lib/service-intake/cafe-priorities";
import {
  isServiceIntakeOverdue,
  SERVICE_INTAKE_KANBAN_COLUMNS,
  SERVICE_INTAKE_PRIORITY_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_TONE,
  serviceIntakeDueAt,
  serviceIntakePriorityRank,
} from "@/lib/service-intake/sla";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function priorityLetter(priority: ServiceIntakeRecord["priority"]) {
  if (!priority) {
    return null;
  }
  return CAFE_PRIORITY_OPTIONS.find((entry) => entry.id === priority)?.letter ?? priority.toUpperCase();
}

function ServiceIntakeCard({
  item,
  busy,
  onOpen,
  onStatusChange,
}: {
  item: ServiceIntakeRecord;
  busy: boolean;
  onOpen: () => void;
  onStatusChange: (status: ServiceIntakeStatus) => void;
}) {
  const overdue = isServiceIntakeOverdue(item);
  const dueAt = serviceIntakeDueAt(item.createdAt, item.priority);
  const statusTone = SERVICE_INTAKE_STATUS_TONE[item.status];
  const letter = priorityLetter(item.priority);

  return (
    <article
      className={cn(
        "grid gap-2 rounded-xl border bg-surface-muted/20 p-3 shadow-sm transition hover:border-accent/30",
        overdue ? "border-rose-500/50" : "border-border/70",
        item.status === "closed" || item.status === "rejected" ? "opacity-80" : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" className="text-left" onClick={onOpen}>
            <p className="font-semibold text-foreground">{item.referenceNumber}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-foreground/90">{item.description}</p>
          </button>
        </div>
        {letter ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold",
              item.priority ? SERVICE_INTAKE_PRIORITY_BADGE_CLASS[item.priority] : undefined,
            )}
          >
            {letter}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            SERVICE_INTAKE_STATUS_BADGE_CLASS[statusTone],
          )}
        >
          {SERVICE_INTAKE_STATUS_LABELS[item.status]}
        </span>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted">
          {SERVICE_INTAKE_REQUEST_TYPE_LABELS[item.requestType]}
        </span>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted">
          {item.serviceTypeHint}
        </span>
        {overdue ? (
          <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
            Po terminie
          </span>
        ) : null}
      </div>

      <div className="grid gap-1 text-xs text-muted">
        <p className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {item.clientName ?? item.contactFullName}
        </p>
        <p>{item.projectName ?? "Obiekt"}</p>
        <p className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Zgłoszono: {formatDateTime(item.createdAt)}
        </p>
        {dueAt ? <p>Termin reakcji: {formatDate(dueAt.slice(0, 10))}</p> : null}
        {item.contactPhone ? (
          <p className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {item.contactPhone}
          </p>
        ) : null}
        {item.priority ? (
          <p>{SERVICE_INTAKE_PRIORITY_LABELS[item.priority]}</p>
        ) : null}
        {item.postWarrantyAction ? (
          <p>{SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS[item.postWarrantyAction]}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          <MessageSquare className="mr-1 h-3.5 w-3.5" />
          Wątek
        </Button>
        {item.status === "new" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onStatusChange("in_review")}
          >
            Przyjmij
          </Button>
        ) : null}
        {item.status === "in_review" ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onStatusChange("converted")}
          >
            Przekształć
          </Button>
        ) : null}
        {item.status !== "closed" && item.status !== "rejected" ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onStatusChange("closed")}
            >
              Zamknij
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onStatusChange("rejected")}
            >
              Odrzuć
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/zgloszenie/watek/${item.trackingToken}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function ServiceIntakeKanban() {
  const [items, setItems] = useState<ServiceIntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServiceIntakeRecord | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/service-intake", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać zgłoszeń.");
      }
      setItems(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const grouped = useMemo(() => {
    const map = new Map<ServiceIntakeStatus, ServiceIntakeRecord[]>();
    for (const status of SERVICE_INTAKE_KANBAN_COLUMNS) {
      map.set(status, []);
    }
    for (const item of items) {
      const bucket = map.get(item.status) ?? [];
      bucket.push(item);
      map.set(item.status, bucket);
    }
    for (const status of SERVICE_INTAKE_KANBAN_COLUMNS) {
      map.set(
        status,
        [...(map.get(status) ?? [])].sort((left, right) => {
          const rankDiff =
            serviceIntakePriorityRank(left.priority) - serviceIntakePriorityRank(right.priority);
          if (rankDiff !== 0) {
            return rankDiff;
          }
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }),
      );
    }
    return map;
  }, [items]);

  async function changeStatus(id: string, status: ServiceIntakeStatus) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zaktualizować statusu.");
      }
      await loadItems();
      if (selected?.id === id) {
        setSelected(payload.item ?? null);
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie tablicy serwisowej…
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => {
          const columnItems = grouped.get(status) ?? [];
          const tone = SERVICE_INTAKE_STATUS_TONE[status];
          return (
            <section
              key={status}
              className="flex w-[min(100%,320px)] shrink-0 flex-col rounded-2xl border border-border/80 bg-surface/40"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {SERVICE_INTAKE_STATUS_LABELS[status]}
                  </p>
                  <p className="text-xs text-muted">{columnItems.length} zgłoszeń</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    SERVICE_INTAKE_STATUS_BADGE_CLASS[tone],
                  )}
                >
                  {columnItems.length}
                </span>
              </header>
              <div className="grid max-h-[70vh] gap-2 overflow-y-auto p-3">
                {columnItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Brak zgłoszeń</p>
                ) : (
                  columnItems.map((item) => (
                    <ServiceIntakeCard
                      key={item.id}
                      item={item}
                      busy={busyId === item.id}
                      onOpen={() => setSelected(item)}
                      onStatusChange={(nextStatus) => void changeStatus(item.id, nextStatus)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selected ? (
        <Card>
          <CardContent className="grid gap-3 py-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-foreground">{selected.referenceNumber}</p>
                <p className="text-sm text-muted">
                  {selected.clientName} · {selected.projectName} · {formatDateTime(selected.createdAt)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Zamknij podgląd
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{selected.description}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href={`/zgloszenie/watek/${selected.trackingToken}`} target="_blank" rel="noreferrer">
                  Otwórz wątek publiczny
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/oferty/nowy">Utwórz ofertę</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
