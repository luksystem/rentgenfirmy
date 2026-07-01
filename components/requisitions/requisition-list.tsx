"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Send, Trash2, X } from "lucide-react";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import {
  REQUISITION_CATEGORY_LABELS,
  REQUISITION_SCOPE_LABELS,
  REQUISITION_SCOPES,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUSES,
  canMarkFulfilled,
  canMarkOrdered,
  canReviewRequisition,
  requisitionStatusTone,
  type Requisition,
  type RequisitionStatus,
} from "@/lib/requisitions/types";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import {
  deleteRequisition,
  fetchRequisitions,
  updateRequisitionStatus,
} from "@/lib/supabase/requisition-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDateTime } from "@/lib/utils";

const ALL = "";

const STATUS_BADGE_CLASS = {
  neutral: "border-border/80 bg-surface-muted/40 text-muted",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
} as const;

export function RequisitionList() {
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const displayName = useAuthStore((state) => state.displayName);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [scopeFilter, setScopeFilter] = useState(ALL);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, client.fullName])),
    [clients],
  );

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchRequisitions();
      setRequisitions(rows);
    } catch {
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useListAutoRefresh(refresh);

  const filtered = useMemo(() => {
    return requisitions.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) {
        return false;
      }
      if (scopeFilter && entry.scope !== scopeFilter) {
        return false;
      }
      return true;
    });
  }, [requisitions, scopeFilter, statusFilter]);

  async function changeStatus(
    requisitionId: string,
    status: RequisitionStatus,
    reviewNote?: string,
  ) {
    setBusyId(requisitionId);
    try {
      const updated = await updateRequisitionStatus(
        requisitionId,
        status,
        displayName || "Zespół",
        reviewNote,
      );
      setRequisitions((current) =>
        current.map((entry) => (entry.id === requisitionId ? updated : entry)),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeRequisition(requisitionId: string) {
    if (!window.confirm("Usunąć to zapotrzebowanie?")) {
      return;
    }
    setBusyId(requisitionId);
    try {
      await deleteRequisition(requisitionId);
      setRequisitions((current) => current.filter((entry) => entry.id !== requisitionId));
    } finally {
      setBusyId(null);
    }
  }

  const filters = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Status">
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value={ALL}>Wszystkie</option>
          {REQUISITION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {REQUISITION_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Zakres">
        <Select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}>
          <option value={ALL}>Wszystkie</option>
          {REQUISITION_SCOPES.map((scope) => (
            <option key={scope} value={scope}>
              {REQUISITION_SCOPE_LABELS[scope]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );

  function renderActions(entry: Requisition) {
    const busy = busyId === entry.id;

    return (
      <div className="flex flex-wrap gap-2">
        {entry.status === "draft" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void changeStatus(entry.id, "submitted")}
          >
            <Send className="mr-1 h-3.5 w-3.5" />
            Zgłoś
          </Button>
        ) : null}
        {canReviewRequisition(entry.status) ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void changeStatus(entry.id, "approved")}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Akceptuj
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const note = window.prompt("Powód odrzucenia (opcjonalnie):") ?? "";
                void changeStatus(entry.id, "rejected", note);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Odrzuć
            </Button>
          </>
        ) : null}
        {canMarkOrdered(entry.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void changeStatus(entry.id, "ordered")}
          >
            Oznacz jako zamówione
          </Button>
        ) : null}
        {canMarkFulfilled(entry.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void changeStatus(entry.id, "fulfilled")}
          >
            Zrealizowane
          </Button>
        ) : null}
        {entry.status === "draft" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void removeRequisition(entry.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="text-sm text-muted">
        {loading ? "Ładowanie…" : `${filtered.length} zapotrzebowań`}
      </div>

      <MobileFiltersPanel title="Filtry">{filters}</MobileFiltersPanel>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">Ładowanie listy…</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            Brak zapotrzebowań. Zgłoś ubrania, narzędzia lub sprzęt.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((entry) => {
            const tone = requisitionStatusTone(entry.status);
            return (
              <Card key={entry.id}>
                <CardContent className="grid gap-3 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{entry.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatDateTime(entry.createdAt)}</p>
                      <p className="mt-1 text-xs font-medium text-foreground/90">
                        Zgłosił: {entry.requestedByName}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_BADGE_CLASS[tone],
                      )}
                    >
                      {REQUISITION_STATUS_LABELS[entry.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    <span>{REQUISITION_CATEGORY_LABELS[entry.category]}</span>
                    <span>·</span>
                    <span>{REQUISITION_SCOPE_LABELS[entry.scope]}</span>
                    {entry.projectId ? (
                      <>
                        <span>·</span>
                        <span>{projectNames.get(entry.projectId) ?? "Projekt"}</span>
                      </>
                    ) : null}
                    {entry.clientId ? (
                      <>
                        <span>·</span>
                        <span>{clientNames.get(entry.clientId) ?? "Klient"}</span>
                      </>
                    ) : null}
                  </div>

                  {entry.description ? (
                    <p className="text-sm text-muted">{entry.description}</p>
                  ) : null}

                  {entry.reviewNote ? (
                    <p className="rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2 text-xs text-muted">
                      Uwaga decyzyjna: {entry.reviewNote}
                      {entry.reviewedByName ? ` (${entry.reviewedByName})` : ""}
                    </p>
                  ) : null}

                  {renderActions(entry)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
