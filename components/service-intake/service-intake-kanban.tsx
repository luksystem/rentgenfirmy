"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import {
  Calendar,
  Coffee,
  ExternalLink,
  GripVertical,
  Loader2,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  User,
} from "lucide-react";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanMobileColumnNav } from "@/components/process/kanban-mobile-column-nav";
import { ServiceIntakeDetailModal } from "@/components/service-intake/service-intake-detail-modal";
import { Button } from "@/components/ui/button";
import { useKanbanMobileColumns } from "@/hooks/use-kanban-mobile-columns";
import { buildGoogleMapsDirectionsUrl } from "@/lib/dashboard/google-maps";
import { confirmServiceIntakeStatusChange } from "@/lib/service-intake/confirm-status-change";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { useAuthStore } from "@/store/auth-store";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { CAFE_PRIORITY_OPTIONS, isHighCafePriority } from "@/lib/service-intake/cafe-priorities";
import { canManageServiceIntakeBoard } from "@/lib/service-intake/status-permissions";
import {
  KANBAN_BOARD_ROOT_CLASS,
  KANBAN_DRAG_HINT,
  KANBAN_MOBILE_COLUMN_BODY_CLASS,
  KANBAN_MOBILE_COLUMN_SHELL_CLASS,
  KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS,
} from "@/lib/process/kanban-ui";
import { resolveKanbanColumnId, TOUCH_DRAG_THRESHOLD_PX } from "@/lib/process/kanban-drag";
import {
  countActiveServiceIntakes,
  countOverdueActiveServiceIntakes,
  isServiceIntakeActive,
  isServiceIntakeInactive,
  isServiceIntakeOverdue,
  SERVICE_INTAKE_KANBAN_COLUMNS,
  SERVICE_INTAKE_STATUS_BADGE_CLASS,
  SERVICE_INTAKE_STATUS_TONE,
  resolveServiceIntakeDueAt,
  serviceIntakeKanbanBadgeClass,
  serviceIntakePriorityRank,
} from "@/lib/service-intake/sla";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS,
  SERVICE_INTAKE_PRIORITY_LABELS,
  SERVICE_INTAKE_REQUEST_TYPE_LABELS,
  SERVICE_INTAKE_STATUS_LABELS,
  type ServiceIntakeRecord,
  type ServiceIntakeRequestType,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function cafeOption(priority: ServiceIntakeRecord["priority"]) {
  if (!priority) {
    return null;
  }
  return CAFE_PRIORITY_OPTIONS.find((entry) => entry.id === priority) ?? null;
}

function ServiceIntakeWarrantyBadge({ item }: { item: ServiceIntakeRecord }) {
  if (item.requestType !== "service") {
    return null;
  }

  const isWarranty = item.serviceTypeHint === "Gwarancyjny";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isWarranty
          ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-300"
          : "border-amber-500/45 bg-amber-500/15 text-amber-200",
      )}
    >
      <Shield className="h-3 w-3 shrink-0" />
      {isWarranty ? "Gwarancyjne" : "Pogwarancyjne"}
    </span>
  );
}

function stopDragPropagation(event: ReactPointerEvent) {
  event.stopPropagation();
}

function ServiceIntakeCard({
  item,
  busy,
  isDragging,
  draggable = true,
  canReopen = false,
  onOpen,
  onStatusChange,
  onDragStart,
  onDragEnd,
  onDragHover,
  onDragDrop,
}: {
  item: ServiceIntakeRecord;
  busy: boolean;
  isDragging?: boolean;
  draggable?: boolean;
  canReopen?: boolean;
  onOpen: () => void;
  onStatusChange: (status: ServiceIntakeStatus) => void;
  onDragStart: () => void;
  onDragEnd?: () => void;
  onDragHover?: (columnId: string | null) => void;
  onDragDrop?: (columnId: string) => void;
}) {
  const canDrag = draggable && !busy;
  const pointerDragRef = useRef<{
    pointerId: number;
    started: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const overdue = !isServiceIntakeInactive(item.status) && isServiceIntakeOverdue(item);
  const dueAt = resolveServiceIntakeDueAt(item);
  const statusTone = SERVICE_INTAKE_STATUS_TONE[item.status];
  const cafe = cafeOption(item.priority);
  const inactive = isServiceIntakeInactive(item.status);
  const directionsUrl = item.clientAddress ? buildGoogleMapsDirectionsUrl(item.clientAddress) : null;

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!canDrag || event.pointerType === "mouse" || event.button !== 0) {
      return;
    }
    pointerDragRef.current = {
      pointerId: event.pointerId,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const dragState = pointerDragRef.current;
    if (!canDrag || !dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (!dragState.started) {
      if (distance < TOUCH_DRAG_THRESHOLD_PX) {
        return;
      }
      dragState.started = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      suppressClickRef.current = true;
      onDragStart();
    }
    event.preventDefault();
    onDragHover?.(resolveKanbanColumnId(event.clientX, event.clientY));
  }

  function finishPointerDrag(event: ReactPointerEvent<HTMLElement>) {
    const dragState = pointerDragRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    if (dragState.started) {
      const columnId = resolveKanbanColumnId(event.clientX, event.clientY);
      if (columnId) {
        onDragDrop?.(columnId);
      }
      onDragEnd?.();
      event.preventDefault();
      event.stopPropagation();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerDragRef.current = null;
  }

  function handleOpenClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onOpen();
  }

  return (
    <article
      draggable={canDrag}
      onDragStart={
        canDrag
          ? (event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
              onDragStart();
            }
          : undefined
      }
      onDragEnd={canDrag ? onDragEnd : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      className={cn(
        "grid gap-2 rounded-xl border p-3 shadow-sm transition",
        canDrag && "touch-manipulation cursor-grab active:cursor-grabbing",
        inactive
          ? "border-dashed border-border/50 bg-surface-muted/10 opacity-50 grayscale"
          : "hover:border-accent/30",
        !inactive && cafe ? cafe.toneClass : !inactive ? "border-border/70 bg-surface-muted/20" : undefined,
        !inactive && overdue ? "ring-1 ring-rose-500/40" : undefined,
        isDragging && "scale-[0.98] opacity-35 ring-2 ring-accent/30",
      )}
    >
      {canDrag ? (
        <div className="flex items-center gap-1 text-muted/70" aria-hidden>
          <GripVertical className="h-4 w-4 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">Przeciągnij</span>
        </div>
      ) : null}
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
        <button type="button" className="w-full text-left" onPointerDown={stopDragPropagation} onClick={handleOpenClick}>
          <p className="font-semibold text-foreground">{item.referenceNumber}</p>
          <p className="mt-0.5 line-clamp-3 text-sm text-foreground/90">{item.description}</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ServiceIntakeWarrantyBadge item={item} />
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
        {dueAt ? <p>Wykonać do: {formatDate(dueAt.slice(0, 10))}</p> : null}
        {item.assigneeName ? (
          <p className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {item.assigneeName}
          </p>
        ) : item.status !== "closed" && item.status !== "rejected" ? (
          <p className="text-amber-200/80">Brak osoby do obsługi</p>
        ) : null}
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
        <Button type="button" size="sm" variant="outline" onPointerDown={stopDragPropagation} onClick={handleOpenClick}>
          <MessageSquare className="mr-1 h-3.5 w-3.5" />
          Szczegóły
        </Button>
        {item.status === "new" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="h-9 min-w-[7.5rem] px-3 text-sm font-bold uppercase tracking-wide"
            onPointerDown={stopDragPropagation}
            onClick={() => onStatusChange("in_review")}
          >
            Przyjmij
          </Button>
        ) : null}
        {item.status === "in_review" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="h-9 min-w-[7.5rem] px-3 text-sm font-bold uppercase tracking-wide"
            onPointerDown={stopDragPropagation}
            onClick={() => onStatusChange("converted")}
          >
            Rozlicz
          </Button>
        ) : null}
        {item.status === "converted" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="h-9 min-w-[7.5rem] px-3 text-sm font-bold uppercase tracking-wide"
            onPointerDown={stopDragPropagation}
            onClick={() => onStatusChange("closed")}
          >
            Zamknij
          </Button>
        ) : null}
        {inactive && canReopen ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onPointerDown={stopDragPropagation}
            onClick={() => onStatusChange("in_review")}
          >
            Otwórz ponownie
          </Button>
        ) : null}
        {directionsUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-accent/40 text-accent hover:bg-accent/10"
            asChild
            onPointerDown={stopDragPropagation}
          >
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="mr-1 h-3.5 w-3.5" />
              Prowadź do
            </a>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" asChild onPointerDown={stopDragPropagation}>
          <Link href={`/zgloszenie/watek/${item.trackingToken}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function ServiceIntakeKanban({
  authorName = "Zespół",
  requestTypeFilter,
}: {
  authorName?: string;
  requestTypeFilter?: ServiceIntakeRequestType;
}) {
  const [items, setItems] = useState<ServiceIntakeRecord[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const profile = useAuthStore((state) => state.profile);
  const canManageBoard = canManageServiceIntakeBoard(profile?.role);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const dragItemIdRef = useRef<string | null>(null);

  const dragItem = dragItemId ? (items.find((entry) => entry.id === dragItemId) ?? null) : null;

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
      const params = new URLSearchParams();
      if (requestTypeFilter) {
        params.set("requestType", requestTypeFilter);
      }
      const query = params.toString();
      const response = await fetch(`/api/service-intake${query ? `?${query}` : ""}`, {
        credentials: "include",
      });
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
  }, [requestTypeFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void fetchTeamProfiles()
      .then(setTeamProfiles)
      .catch(() => setTeamProfiles([]));
  }, []);

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
          const inactiveDiff =
            Number(isServiceIntakeInactive(left.status)) - Number(isServiceIntakeInactive(right.status));
          if (inactiveDiff !== 0) {
            return inactiveDiff;
          }
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

  const attentionItems = useMemo(
    () =>
      items
        .filter((item) => {
          if (!isServiceIntakeActive(item.status)) {
            return false;
          }
          return (
            isServiceIntakeOverdue(item) ||
            (item.priority != null && isHighCafePriority(item.priority))
          );
        })
        .sort((left, right) => {
          const rankDiff =
            serviceIntakePriorityRank(left.priority) - serviceIntakePriorityRank(right.priority);
          if (rankDiff !== 0) {
            return rankDiff;
          }
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        })
        .slice(0, 12),
    [items],
  );

  function beginDrag(itemId: string) {
    dragItemIdRef.current = itemId;
    setDragItemId(itemId);
  }

  function clearDragState() {
    dragItemIdRef.current = null;
    setDragItemId(null);
    setDragOverColumnId(null);
  }

  async function handleDrop(columnId: string, itemIdOverride?: string) {
    if (!canManageBoard) {
      clearDragState();
      return;
    }
    const itemId = itemIdOverride ?? dragItemIdRef.current ?? dragItemId;
    if (!itemId) {
      return;
    }
    const nextStatus = columnId as ServiceIntakeStatus;
    const currentItem = items.find((entry) => entry.id === itemId);
    clearDragState();
    if (!currentItem || currentItem.status === nextStatus) {
      return;
    }
    await changeStatus(itemId, nextStatus);
  }

  async function changeStatus(id: string, status: ServiceIntakeStatus) {
    const currentItem = items.find((entry) => entry.id === id);
    if (!confirmServiceIntakeStatusChange(status, currentItem?.status)) {
      return;
    }
    setBusyId(id);
    const snapshot = items;
    const patch: { status: ServiceIntakeStatus; assigneeId?: string } = { status };
    if (status === "in_review" && !currentItem?.assigneeId && profile?.id) {
      patch.assigneeId = profile.id;
    }
    setItems((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status,
              closedAt: isServiceIntakeInactive(status) ? new Date().toISOString() : null,
              assigneeId: patch.assigneeId ?? entry.assigneeId,
              assigneeName:
                patch.assigneeId && profile?.id === patch.assigneeId
                  ? getUserDisplayName(profile)
                  : entry.assigneeName,
            }
          : entry,
      ),
    );
    try {
      const response = await fetch(`/api/service-intake/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
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

  function handleItemDeleted(id: string) {
    setItems((current) => current.filter((entry) => entry.id !== id));
    setSelectedId(null);
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

      {attentionItems.length > 0 ? (
        <section className="shrink-0 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-rose-100">
              Do obsługi teraz ({attentionItems.length})
            </p>
            <p className="text-[11px] text-rose-100/80">Przeterminowane, ASAP lub krytyczne</p>
          </div>
          <ul className="grid gap-2">
            {attentionItems.map((item) => {
              const directionsUrl = item.clientAddress
                ? buildGoogleMapsDirectionsUrl(item.clientAddress)
                : null;
              const overdue = isServiceIntakeOverdue(item);
              return (
                <li
                  key={`attention-${item.id}`}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-rose-500/25 bg-background/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.clientName?.trim() || item.contactFullName || "Klient"}
                      {item.projectName ? ` · ${item.projectName}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {SERVICE_INTAKE_STATUS_LABELS[item.status]}
                      {item.priority
                        ? ` · ${SERVICE_INTAKE_PRIORITY_LABELS[item.priority]}`
                        : ""}
                      {overdue ? " · przeterminowane" : ""}
                      {item.clientAddress ? ` · ${item.clientAddress}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {directionsUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-accent/40 text-accent hover:bg-accent/10"
                        asChild
                      >
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                          <Navigation className="mr-1 h-3.5 w-3.5" />
                          Prowadź do
                        </a>
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedId(item.id)}>
                      Otwórz
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <KanbanMobileColumnNav
        columns={columns}
        activeColumnId={activeColumnId}
        onSelect={scrollToColumn}
        openCountForColumn={(columnId) =>
          countActiveServiceIntakes(grouped.get(columnId as ServiceIntakeStatus) ?? [])
        }
        badgeToneForColumn={(columnId) => {
          const columnItems = grouped.get(columnId as ServiceIntakeStatus) ?? [];
          const activeCount = countActiveServiceIntakes(columnItems);
          const overdueCount = countOverdueActiveServiceIntakes(columnItems);
          if (activeCount <= 0) {
            return "empty";
          }
          return overdueCount > 0 ? "overdue" : "ok";
        }}
      />

      <p className="hidden shrink-0 text-sm text-muted md:block">{KANBAN_DRAG_HINT}</p>

      <div ref={scrollerRef} className={KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS}>
        {SERVICE_INTAKE_KANBAN_COLUMNS.map((status) => {
          const columnItems = grouped.get(status) ?? [];
          const activeCount = countActiveServiceIntakes(columnItems);
          const inactiveCount = columnItems.length - activeCount;
          const overdueCount = countOverdueActiveServiceIntakes(columnItems);
          const isArchiveColumn = status === "closed" || status === "rejected";
          const isDropTarget = Boolean(dragItemId && dragOverColumnId === status);
          return (
            <section
              key={status}
              ref={(node) => setColumnRef(status, node as HTMLDivElement | null)}
              data-column-id={status}
              className={cn(KANBAN_MOBILE_COLUMN_SHELL_CLASS, getKanbanColumnDropTargetClasses(isDropTarget))}
              style={{ minHeight: `${Math.max(220, maxColumnCount * 168)}px` }}
              onDragEnter={(event) => {
                if (!dragItemId) {
                  return;
                }
                event.preventDefault();
                setDragOverColumnId(status);
              }}
              onDragOver={(event) => {
                if (!dragItemId) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumnId(status);
              }}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(related)) {
                  setDragOverColumnId((current) => (current === status ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleDrop(status);
              }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {SERVICE_INTAKE_STATUS_LABELS[status]}
                  </p>
                  <p className="text-xs text-muted">
                    {isArchiveColumn
                      ? `${columnItems.length} zarchiwizowanych`
                      : inactiveCount > 0
                        ? `${activeCount} aktywnych · ${inactiveCount} nieaktywnych`
                        : `${activeCount} aktywnych`}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    serviceIntakeKanbanBadgeClass({ activeCount, overdueCount }),
                  )}
                >
                  {activeCount}
                </span>
              </header>
              <div className={cn(KANBAN_MOBILE_COLUMN_BODY_CLASS, isDropTarget && "bg-accent/[0.03]")}>
                {columnItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Brak zgłoszeń</p>
                ) : (
                  columnItems.map((item) => (
                    <ServiceIntakeCard
                      key={item.id}
                      item={item}
                      busy={busyId === item.id}
                      isDragging={dragItemId === item.id}
                      draggable={canManageBoard}
                      canReopen={canManageBoard}
                      onOpen={() => setSelectedId(item.id)}
                      onStatusChange={(nextStatus) => void changeStatus(item.id, nextStatus)}
                      onDragStart={() => beginDrag(item.id)}
                      onDragEnd={clearDragState}
                      onDragHover={(columnId) => setDragOverColumnId(columnId)}
                      onDragDrop={(columnId) => void handleDrop(columnId, item.id)}
                    />
                  ))
                )}
                {isDropTarget && dragItem ? (
                  <KanbanDropPlaceholder title={dragItem.referenceNumber} />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <ServiceIntakeDetailModal
        intakeId={selectedId}
        authorName={authorName}
        teamProfiles={teamProfiles}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onUpdated={handleItemUpdated}
        onDeleted={handleItemDeleted}
      />
    </div>
  );
}
