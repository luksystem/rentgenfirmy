"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { InternalAcceptanceItemDialog } from "@/components/process/internal-acceptance-item-dialog";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/auth/types";
import { INTERNAL_ACCEPTANCE_STATUS_STYLES } from "@/lib/internal-acceptance/status-styles";
import {
  INTERNAL_ACCEPTANCE_STATUS_LABELS,
  type InternalAcceptanceItemState,
  type InternalAcceptanceState,
  type InternalAcceptanceStatus,
} from "@/lib/internal-acceptance/types";
import {
  ensureInternalAcceptanceState,
  updateInternalAcceptanceItem,
} from "@/lib/supabase/internal-acceptance-repository";
import { cn, formatDateTime } from "@/lib/utils";

export function ProcessInternalAcceptanceBoard({
  projectId,
  templateItemId,
  initialState,
  readOnly = false,
  actorId,
  actorName = "Zespół",
  teamProfiles = [],
  publicToken,
  onStateChange,
}: {
  projectId: string;
  templateItemId: string;
  initialState?: InternalAcceptanceState | null;
  readOnly?: boolean;
  actorId?: string;
  actorName?: string;
  teamProfiles?: UserProfile[];
  publicToken?: string;
  onStateChange?: (state: InternalAcceptanceState) => void;
}) {
  const [state, setState] = useState<InternalAcceptanceState | null>(initialState ?? null);
  const [loading, setLoading] = useState(!initialState);
  const [regenerating, setRegenerating] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actor = useMemo(
    () => ({ id: actorId, name: actorName.trim() || "Zespół" }),
    [actorId, actorName],
  );

  useEffect(() => {
    if (initialState) {
      setState(initialState);
      setLoading(false);
    }
  }, [initialState]);

  useEffect(() => {
    if (initialState || !projectId || !templateItemId) {
      return;
    }
    let cancelled = false;
    void ensureInternalAcceptanceState(projectId, templateItemId)
      .then((generated) => {
        if (!cancelled) {
          setState(generated);
          onStateChange?.(generated);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Błąd generowania odbioru.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialState, onStateChange, projectId, templateItemId]);

  const grouped = useMemo(() => {
    if (!state) {
      return [];
    }
    const map = new Map<string, InternalAcceptanceItemState[]>();
    for (const item of state.items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [state]);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const generated = await ensureInternalAcceptanceState(projectId, templateItemId);
      setState(generated);
      onStateChange?.(generated);
    } catch (regenError) {
      setError(regenError instanceof Error ? regenError.message : "Błąd odświeżania checklisty.");
    } finally {
      setRegenerating(false);
    }
  }

  async function persistItemPatch(itemKey: string, patch: Partial<InternalAcceptanceItemState>) {
    if (readOnly) {
      return;
    }
    setSavingKey(itemKey);
    setError(null);
    try {
      if (publicToken) {
        const response = await fetch(`/api/odbior/${publicToken}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemKey, patch, actorName: actor.name }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Błąd zapisu.");
        }
        const body = (await response.json()) as { internalAcceptance: InternalAcceptanceState };
        if (body.internalAcceptance) {
          setState(body.internalAcceptance);
          onStateChange?.(body.internalAcceptance);
        }
        return;
      }

      const updated = await updateInternalAcceptanceItem(
        projectId,
        templateItemId,
        itemKey,
        patch,
        actor,
      );
      const next = updated.internalAcceptanceState;
      if (next) {
        setState(next);
        onStateChange?.(next);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setSavingKey(null);
    }
  }

  function handleLocalFieldChange(itemKey: string, patch: Partial<InternalAcceptanceItemState>) {
    setState((current) =>
      current
        ? {
            ...current,
            items: current.items.map((entry) =>
              entry.itemKey === itemKey ? { ...entry, ...patch } : entry,
            ),
          }
        : current,
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Generowanie checklisty odbioru wewnętrznego…</p>;
  }

  if (!state) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted">Brak wygenerowanej checklisty QA.</p>
        {!readOnly ? (
          <Button type="button" onClick={() => void handleRegenerate()} disabled={regenerating}>
            {regenerating ? "Generowanie…" : "Wygeneruj checklistę"}
          </Button>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    );
  }

  const summary = state.summary;
  const activeItem = state.items.find((item) => item.itemKey === activeKey) ?? null;

  return (
    <div className="grid gap-4 pb-2">
      <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/25 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" />
            {summary.mandatoryPassed}/{summary.mandatoryTotal} obowiązkowych · {summary.percentComplete}%
          </p>
          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", regenerating && "animate-spin")} />
              Odśwież
            </Button>
          ) : null}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              summary.readyForClientHandover ? "bg-emerald-500" : "bg-accent",
            )}
            style={{ width: `${summary.percentComplete}%` }}
          />
        </div>
        {summary.readyForClientHandover ? (
          <p className="text-xs font-medium text-emerald-300">Gotowe do odbioru klienta</p>
        ) : summary.blockers.length ? (
          <p className="text-xs text-amber-200/90">
            Wskazówki: {summary.blockers.slice(0, 3).join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4">
        {grouped.map(([category, items]) => (
          <section key={category} className="rounded-xl border border-border/70 bg-surface/40 p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{category}</h3>
            <div className="grid gap-2">
              {items.map((item) => {
                const styles = INTERNAL_ACCEPTANCE_STATUS_STYLES[item.status];
                return (
                  <button
                    key={item.itemKey}
                    type="button"
                    onClick={() => setActiveKey(item.itemKey)}
                    className={cn(
                      "rounded-lg border border-l-4 px-3 py-2.5 text-left text-sm transition",
                      styles.row,
                      activeKey === item.itemKey && styles.rowActive,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)} />
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 pl-4 text-xs text-muted">{item.source.refLabel}</p>
                    {item.assigneeName || item.lastUpdatedAt || item.completedAt ? (
                      <p className="mt-1 pl-4 text-[11px] text-muted/80">
                        {item.assigneeName ? `Odp.: ${item.assigneeName}` : null}
                        {item.assigneeName && (item.lastUpdatedAt || item.completedAt) ? " · " : null}
                        {item.lastUpdatedAt || item.completedAt
                          ? formatDateTime(item.lastUpdatedAt ?? item.completedAt)
                          : null}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <InternalAcceptanceItemDialog
        item={activeItem}
        open={activeKey !== null}
        teamProfiles={teamProfiles}
        onOpenChange={(open) => {
          if (!open) {
            setActiveKey(null);
          }
        }}
        readOnly={readOnly}
        saving={activeKey !== null && savingKey === activeKey}
        onStatusChange={(status) => {
          if (activeKey) {
            void persistItemPatch(activeKey, { status });
          }
        }}
        onFieldChange={(patch) => {
          if (activeKey) {
            void persistItemPatch(activeKey, patch);
          }
        }}
        onLocalFieldChange={(patch) => {
          if (activeKey) {
            handleLocalFieldChange(activeKey, patch);
          }
        }}
      />

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: InternalAcceptanceStatus }) {
  const styles = INTERNAL_ACCEPTANCE_STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles.badge,
      )}
    >
      {INTERNAL_ACCEPTANCE_STATUS_LABELS[status]}
    </span>
  );
}
