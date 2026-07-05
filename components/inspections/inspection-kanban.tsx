"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ClipboardCheck,
  GripVertical,
  Loader2,
  MessageSquare,
  RefreshCw,
  User,
} from "lucide-react";
import { InspectionDetailModal } from "@/components/inspections/inspection-detail-modal";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanMobileColumnNav } from "@/components/process/kanban-mobile-column-nav";
import { Button } from "@/components/ui/button";
import { useKanbanMobileColumns } from "@/hooks/use-kanban-mobile-columns";
import {
  KANBAN_BOARD_ROOT_CLASS,
  KANBAN_DRAG_HINT,
  KANBAN_MOBILE_COLUMN_BODY_CLASS,
  KANBAN_MOBILE_COLUMN_SHELL_CLASS,
  KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS,
} from "@/lib/process/kanban-ui";
import { isInspectionPlanningDue } from "@/lib/inspections/schedule";
import {
  INSPECTION_KANBAN_COLUMNS,
  INSPECTION_STATUS_LABELS,
  type InspectionRecord,
  type InspectionStatus,
} from "@/lib/inspections/types";
import { cn, formatDate } from "@/lib/utils";

function InspectionCard({
  item,
  busy,
  onOpen,
}: {
  item: InspectionRecord;
  busy: boolean;
  onOpen: () => void;
}) {
  const planningDue = isInspectionPlanningDue({
    preliminaryDate: item.preliminaryDate,
    confirmedDate: item.confirmedDate,
    status: item.status,
  });

  return (
    <article
      className={cn(
        "grid gap-2 rounded-xl border p-3 shadow-sm transition hover:border-accent/30",
        planningDue ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-border/70 bg-surface-muted/20",
      )}
    >
      <button type="button" className="w-full text-left" onClick={onOpen} disabled={busy}>
        <p className="font-semibold text-foreground">{item.systemLabel}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.title}</p>
      </button>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted">
          {INSPECTION_STATUS_LABELS[item.status]}
        </span>
        {planningDue ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            Zaplanuj termin
          </span>
        ) : null}
      </div>

      <div className="grid gap-1 text-xs text-muted">
        <p className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {item.clientName ?? "Klient"}
        </p>
        {item.responsibleName || item.assigneeName ? (
          <p className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {item.assigneeName ?? item.responsibleName}
          </p>
        ) : (
          <p className="text-amber-200/80">Brak osoby odpowiedzialnej</p>
        )}
        <p className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {item.confirmedDate
            ? `Termin: ${formatDate(item.confirmedDate)}`
            : item.preliminaryDate
              ? `Wstępnie: ${formatDate(item.preliminaryDate)}`
              : "Bez daty"}
        </p>
      </div>

      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onOpen}>
        <MessageSquare className="mr-1 h-3.5 w-3.5" />
        Szczegóły
      </Button>
    </article>
  );
}

export function InspectionKanban() {
  const [items, setItems] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      INSPECTION_KANBAN_COLUMNS.map((status) => ({
        id: status,
        title: INSPECTION_STATUS_LABELS[status],
      })),
    [],
  );

  const { activeColumnId, scrollerRef, scrollToColumn, setColumnRef } = useKanbanMobileColumns(columns);

  const loadItems = useCallback(async (options?: { manual?: boolean }) => {
    if (options?.manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetch("/api/inspections", { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać przeglądów.");
      }
      const next = (payload.items ?? []) as InspectionRecord[];
      setItems((current) => {
        const currentSig = current.map((entry) => `${entry.id}:${entry.updatedAt}`).join("|");
        const nextSig = next.map((entry) => `${entry.id}:${entry.updatedAt}`).join("|");
        return currentSig === nextSig ? current : next;
      });
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
    function onReload() {
      void loadItems();
    }
    window.addEventListener("inspections-reload", onReload);
    return () => window.removeEventListener("inspections-reload", onReload);
  }, [loadItems]);

  const grouped = useMemo(() => {
    const map = new Map<InspectionStatus, InspectionRecord[]>();
    for (const status of INSPECTION_KANBAN_COLUMNS) {
      map.set(status, []);
    }
    for (const item of items) {
      const bucket = map.get(item.status) ?? [];
      bucket.push(item);
      map.set(item.status, bucket);
    }
    for (const status of INSPECTION_KANBAN_COLUMNS) {
      map.set(
        status,
        [...(map.get(status) ?? [])].sort((left, right) => {
          const leftDate = left.confirmedDate ?? left.preliminaryDate ?? left.createdAt;
          const rightDate = right.confirmedDate ?? right.preliminaryDate ?? right.createdAt;
          return leftDate.localeCompare(rightDate);
        }),
      );
    }
    return map;
  }, [items]);

  const maxColumnCount = useMemo(
    () => Math.max(1, ...INSPECTION_KANBAN_COLUMNS.map((status) => grouped.get(status)?.length ?? 0)),
    [grouped],
  );

  async function moveItem(itemId: string, status: InspectionStatus) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item || item.status === status) {
      return;
    }

    if (status === "planned" && !item.confirmedDate) {
      setSelectedId(itemId);
      setError("Otwórz przegląd i ustaw konkretną datę przed przeniesieniem do „Zaplanowane”.");
      return;
    }

    if (status === "completed" || status === "billing") {
      const hasSignatures =
        item.protocolCompanySignedAt &&
        item.protocolClientSignedAt;
      if (!hasSignatures) {
        setSelectedId(itemId);
        setError("Otwórz przegląd, uzupełnij protokół i podpisz przed przeniesieniem.");
        return;
      }
    }

    setBusyId(itemId);
    setError(null);
    try {
      const response = await fetch(`/api/inspections/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          confirmedDate: status === "planned" ? item.confirmedDate : item.confirmedDate,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zmienić statusu.");
      }
      setItems((current) =>
        current.map((entry) => (entry.id === itemId ? (payload.item as InspectionRecord) : entry)),
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inspections-count-changed"));
      }
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Błąd.");
    } finally {
      setBusyId(null);
      setDragItemId(null);
      setDragOverColumnId(null);
    }
  }

  const selected = selectedId ? items.find((entry) => entry.id === selectedId) ?? null : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie tablicy przeglądów…
      </div>
    );
  }

  return (
    <div className={cn(KANBAN_BOARD_ROOT_CLASS, "md:min-h-[calc(100vh-12rem)]")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <ClipboardCheck className="h-4 w-4" />
          {items.length} przeglądów na tablicy
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void loadItems({ manual: true })}
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Odśwież
        </Button>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}

      <KanbanMobileColumnNav
        columns={columns}
        activeColumnId={activeColumnId}
        onSelect={scrollToColumn}
        openCountForColumn={(columnId) => (grouped.get(columnId as InspectionStatus) ?? []).length}
      />

      <p className="mb-3 hidden shrink-0 text-sm text-muted md:block">{KANBAN_DRAG_HINT}</p>

      <div ref={scrollerRef} className={KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS}>
        {columns.map((column) => {
          const columnItems = grouped.get(column.id as InspectionStatus) ?? [];
          const isDropTarget = Boolean(dragItemId && dragOverColumnId === column.id);

          return (
            <section
              key={column.id}
              ref={(node) => setColumnRef(column.id, node as HTMLDivElement | null)}
              data-column-id={column.id}
              className={cn(KANBAN_MOBILE_COLUMN_SHELL_CLASS, getKanbanColumnDropTargetClasses(isDropTarget))}
              style={{ minHeight: `${Math.max(220, maxColumnCount * 168)}px` }}
              onDragEnter={(event) => {
                if (!dragItemId) {
                  return;
                }
                event.preventDefault();
                setDragOverColumnId(column.id);
              }}
              onDragOver={(event) => {
                if (!dragItemId) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumnId(column.id);
              }}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(related)) {
                  setDragOverColumnId((current) => (current === column.id ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const itemId = event.dataTransfer.getData("text/plain") || dragItemId;
                if (itemId) {
                  void moveItem(itemId, column.id as InspectionStatus);
                }
              }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{column.title}</p>
                  <p className="text-xs text-muted">
                    {columnItems.length === 1 ? "1 przegląd" : `${columnItems.length} przeglądów`}
                  </p>
                </div>
                <span className="rounded-full border border-border/70 bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-muted">
                  {columnItems.length}
                </span>
              </header>

              <div className={cn(KANBAN_MOBILE_COLUMN_BODY_CLASS, isDropTarget && "bg-accent/[0.03]")}>
                {dragItemId && isDropTarget ? <KanbanDropPlaceholder /> : null}
                {columnItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Brak przeglądów</p>
                ) : (
                  columnItems.map((item) => (
                    <div
                      key={item.id}
                      draggable={!busyId}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.id);
                        setDragItemId(item.id);
                      }}
                      onDragEnd={() => {
                        setDragItemId(null);
                        setDragOverColumnId(null);
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted/70">
                        <GripVertical className="h-3.5 w-3.5" />
                        Przeciągnij
                      </div>
                      <InspectionCard
                        item={item}
                        busy={busyId === item.id}
                        onOpen={() => setSelectedId(item.id)}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <InspectionDetailModal
        key={selectedId ?? "closed"}
        item={selected}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        onUpdated={(updated) => {
          setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inspections-count-changed"));
          }
        }}
        onDeleted={(id) => {
          setItems((current) => current.filter((entry) => entry.id !== id));
          setSelectedId(null);
        }}
      />
    </div>
  );
}
