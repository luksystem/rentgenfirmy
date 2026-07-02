"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Coffee,
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  User,
} from "lucide-react";
import { KanbanMobileColumnNav } from "@/components/process/kanban-mobile-column-nav";
import { ServiceIntakeDetailModal } from "@/components/service-intake/service-intake-detail-modal";
import { Button } from "@/components/ui/button";
import { useKanbanMobileColumns } from "@/hooks/use-kanban-mobile-columns";
import { CAFE_PRIORITY_OPTIONS } from "@/lib/service-intake/cafe-priorities";
import {
  KANBAN_BOARD_ROOT_CLASS,
  KANBAN_MOBILE_COLUMN_BODY_CLASS,
  KANBAN_MOBILE_COLUMN_SHELL_CLASS,
  KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS,
} from "@/lib/process/kanban-ui";
import {
  isServiceIntakeOverdue,
  SERVICE_INTAKE_KANBAN_COLUMNS,
  SERVICE_INTAKE_STATUS_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_TONE,
  serviceIntakeDueAt,
  serviceIntakePriorityRank,
} from "@/lib/service-intake/sla";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS,
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeRecord,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function cafeOption(priority: ServiceIntakeRecord["priority"]) {
  if (!priority) {
    return null;
  }
  return CAFE_PRIORITY_OPTIONS.find((entry) => entry.id === priority) ?? null;
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
  const cafe = cafeOption(item.priority);

  return (
    <article
      className={cn(
        "grid gap-2 rounded-xl border p-3 shadow-sm transition hover:border-accent/30",
        cafe ? cafe.toneClass : "border-border/70 bg-surface-muted/20",
        overdue ? "ring-1 ring-rose-500/40" : undefined,
        item.status === "closed" || item.status === "rejected" ? "opacity-80" : undefined,
      )}
    >
      {cafe ? (
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide",
              cafe.letterClass,
            )}
          >
            <Coffee className="h-3.5 w-3.5" />
            {cafe.letter} · {cafe.title}
          </span>
          <span className="text-[10px] font-medium text-muted">CAFE</span>
        </div>
      ) : null}

      <div className="min-w-0">
        <button type="button" className="w-full text-left" onClick={onOpen}>
          <p className="font-semibold text-foreground">{item.referenceNumber}</p>
          <p className="mt-0.5 line-clamp-3 text-sm text-foreground/90">{item.description}</p>
        </button>
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
          {formatDateTime(item.createdAt)}
        </p>
        {dueAt ? <p>Termin: {formatDate(dueAt.slice(0, 10))}</p> : null}
        {item.contactPhone ? (
          <p className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {item.contactPhone}
          </p>
        ) : null}
        {item.priority ? <p>{SERVICE_INTAKE_PRIORITY_LABELS[item.priority]}</p> : null}
        {item.postWarrantyAction ? (
          <p>{SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS[item.postWarrantyAction]}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          <MessageSquare className="mr-1 h-3.5 w-3.5" />
          Szczegóły
        </Button>
        {item.status === "new" ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => onStatusChange("in_review")}>
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
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/zgloszenie/watek/${item.trackingToken}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function ServiceIntakeKanban({ authorName = "Zespół" }: { authorName?: string }) {
  const [items, setItems] = useState<ServiceIntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => ({
        id: status,
        title: SERVICE_INTAKE_STATUS_LABELS[status],
      })),
    [],
  );

  const { activeColumnId, scrollerRef, scrollToColumn, setColumnRef } = useKanbanMobileColumns(columns);

  const loadItems = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadItems({ silent: true });
      }
    }, 30000);
    const onFocus = () => void loadItems({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
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

  const maxColumnCount = useMemo(
    () => Math.max(1, ...SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => grouped.get(status)?.length ?? 0)),
    [grouped],
  );

  async function changeStatus(id: string, status: ServiceIntakeStatus) {
    setBusyId(id);
    const snapshot = items;
    setItems((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, status } : entry)),
    );
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
      setItems((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...(payload.item as ServiceIntakeRecord),
                clientName: entry.clientName,
                projectName: entry.projectName,
              }
            : entry,
        ),
      );
    } catch (updateError) {
      setItems(snapshot);
      setError(updateError instanceof Error ? updateError.message : "Błąd.");
    } finally {
      setBusyId(null);
    }
  }

  function handleItemUpdated(updated: ServiceIntakeRecord) {
    setItems((current) =>
      current.map((entry) =>
        entry.id === updated.id
          ? { ...entry, ...updated, clientName: entry.clientName, projectName: entry.projectName }
          : entry,
      ),
    );
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
    <div className={cn(KANBAN_BOARD_ROOT_CLASS, "md:min-h-[calc(100vh-8rem)]")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {error ? <p className="text-sm text-rose-400">{error}</p> : <span />}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={() => void loadItems({ silent: true })}
        >
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", refreshing ? "animate-spin" : undefined)} />
          Odśwież
        </Button>
      </div>

      <KanbanMobileColumnNav
        columns={columns}
        activeColumnId={activeColumnId}
        onSelect={scrollToColumn}
        openCountForColumn={(columnId) => grouped.get(columnId as ServiceIntakeStatus)?.length ?? 0}
      />

      <div ref={scrollerRef} className={KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS}>
        {SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => {
          const columnItems = grouped.get(status) ?? [];
          const tone = SERVICE_INTAKE_STATUS_TONE[status];
          return (
            <section
              key={status}
              ref={(node) => setColumnRef(status, node as HTMLDivElement | null)}
              data-column-id={status}
              className={KANBAN_MOBILE_COLUMN_SHELL_CLASS}
              style={{ minHeight: `${Math.max(220, maxColumnCount * 168)}px` }}
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
              <div className={KANBAN_MOBILE_COLUMN_BODY_CLASS}>
                {columnItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Brak zgłoszeń</p>
                ) : (
                  columnItems.map((item) => (
                    <ServiceIntakeCard
                      key={item.id}
                      item={item}
                      busy={busyId === item.id}
                      onOpen={() => setSelectedId(item.id)}
                      onStatusChange={(nextStatus) => void changeStatus(item.id, nextStatus)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ServiceIntakeDetailModal
        intakeId={selectedId}
        authorName={authorName}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onUpdated={handleItemUpdated}
      />
    </div>
  );
}
