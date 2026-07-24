"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Send, Trash2, X } from "lucide-react";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { TeamProfileSelect } from "@/components/process/team-profile-select";
import {
  REQUISITION_CATEGORY_LABELS,
  REQUISITION_SCOPE_LABELS,
  REQUISITION_SCOPES,
  REQUISITION_STATUS_LABELS,
  canMarkFulfilled,
  canMarkOrdered,
  canReviewRequisition,
  isRequisitionOrderOverdue,
  requisitionStatusTone,
  type Requisition,
  type RequisitionStatus,
} from "@/lib/requisitions/types";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import {
  deleteRequisition,
  fetchRequisitions,
  updateRequisitionOrderPlan,
  updateRequisitionStatus,
} from "@/lib/supabase/requisition-repository";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { formatPartyName } from "@/lib/party/display-name";
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
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState(ALL);
  const [showArchive, setShowArchive] = useState(false);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, formatPartyName(client)])),
    [clients],
  );

  const profileNames = useMemo(
    () => new Map(teamProfiles.map((profile) => [profile.id, getUserDisplayName(profile)])),
    [teamProfiles],
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

  useEffect(() => {
    void fetchTeamProfiles()
      .then(setTeamProfiles)
      .catch(() => setTeamProfiles([]));
  }, []);

  const scoped = useMemo(() => {
    return requisitions.filter((entry) => !scopeFilter || entry.scope === scopeFilter);
  }, [requisitions, scopeFilter]);

  const submitted = scoped.filter((entry) => entry.status === "submitted");
  const approved = scoped.filter((entry) => entry.status === "approved");
  const ordered = scoped.filter((entry) => entry.status === "ordered");
  const archive = scoped.filter((entry) =>
    ["draft", "rejected", "fulfilled"].includes(entry.status),
  );

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

  async function saveOrderPlan(
    requisitionId: string,
    input: { orderOwnerId: string | null; orderDueAt: string | null },
  ) {
    setBusyId(requisitionId);
    try {
      const updated = await updateRequisitionOrderPlan(requisitionId, input);
      setRequisitions((current) =>
        current.map((entry) => (entry.id === requisitionId ? updated : entry)),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeRequisition(requisitionId: string) {
    if (!window.confirm("Usunąć to zapotrzebowanie? Tej operacji nie można cofnąć.")) {
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

  function renderActions(entry: Requisition) {
    const busy = busyId === entry.id;
    const canDelete = entry.status === "draft" || isAdministrator;

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
        {canDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            title={isAdministrator ? "Usuń (admin)" : "Usuń"}
            onClick={() => void removeRequisition(entry.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          </Button>
        ) : null}
      </div>
    );
  }

  function renderMeta(entry: Requisition) {
    return (
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
    );
  }

  function renderCard(entry: Requisition, options?: { showOrderPlan?: boolean }) {
    const tone = requisitionStatusTone(entry.status);
    const overdue = isRequisitionOrderOverdue(entry);

    return (
      <Card
        key={entry.id}
        className={cn(overdue && "border-rose-500/50 bg-rose-500/5")}
      >
        <CardContent className="grid gap-3 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">{entry.title}</p>
              <p className="mt-0.5 text-xs text-muted">{formatDateTime(entry.createdAt)}</p>
              <p className="mt-1 text-xs font-medium text-foreground/90">
                Zgłosił: {entry.requestedByName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  STATUS_BADGE_CLASS[tone],
                )}
              >
                {REQUISITION_STATUS_LABELS[entry.status]}
              </span>
              {overdue ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-200">
                  <AlertTriangle className="h-3 w-3" />
                  Po terminie zamówienia
                </span>
              ) : null}
            </div>
          </div>

          {renderMeta(entry)}

          {entry.description ? <p className="text-sm text-muted">{entry.description}</p> : null}

          {entry.reviewNote ? (
            <p className="rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2 text-xs text-muted">
              Uwaga decyzyjna: {entry.reviewNote}
              {entry.reviewedByName ? ` (${entry.reviewedByName})` : ""}
            </p>
          ) : null}

          {options?.showOrderPlan ? (
            <div className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3 sm:grid-cols-2">
              <Field label="Odpowiedzialny za zamówienie">
                <TeamProfileSelect
                  value={entry.orderOwnerId ?? ""}
                  teamProfiles={teamProfiles}
                  onChange={(profileId) =>
                    void saveOrderPlan(entry.id, {
                      orderOwnerId: profileId || null,
                      orderDueAt: entry.orderDueAt,
                    })
                  }
                  disabled={busyId === entry.id}
                />
              </Field>
              <Field label="Termin zamówienia">
                <Input
                  type="date"
                  value={entry.orderDueAt ?? ""}
                  disabled={busyId === entry.id}
                  onChange={(event) =>
                    void saveOrderPlan(entry.id, {
                      orderOwnerId: entry.orderOwnerId,
                      orderDueAt: event.target.value || null,
                    })
                  }
                />
              </Field>
              {entry.orderOwnerId ? (
                <p className="text-xs text-muted sm:col-span-2">
                  Odpowiedzialny: {profileNames.get(entry.orderOwnerId) ?? "—"}
                </p>
              ) : null}
            </div>
          ) : null}

          {renderActions(entry)}
        </CardContent>
      </Card>
    );
  }

  function renderSection(title: string, entries: Requisition[], options?: { showOrderPlan?: boolean }) {
    return (
      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {title}
          <span className="rounded-full bg-surface-muted/60 px-2 py-0.5 text-xs font-medium text-muted">
            {entries.length}
          </span>
        </h2>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted">Brak pozycji.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">{entries.map((entry) => renderCard(entry, options))}</div>
        )}
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="text-sm text-muted">
        {loading ? "Ładowanie…" : `${scoped.length} zapotrzebowań`}
      </div>

      <MobileFiltersPanel title="Filtry">
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
      </MobileFiltersPanel>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">Ładowanie listy…</CardContent>
        </Card>
      ) : scoped.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            Brak zapotrzebowań. Zgłoś ubrania, narzędzia lub sprzęt.
          </CardContent>
        </Card>
      ) : (
        <>
          {renderSection("Do akceptacji", submitted)}
          {renderSection("Do zamówienia", approved, { showOrderPlan: true })}
          {renderSection("Zamówione", ordered)}

          <section className="grid gap-3">
            <button
              type="button"
              className="text-left text-sm font-semibold text-muted hover:text-foreground"
              onClick={() => setShowArchive((value) => !value)}
            >
              {showArchive ? "▾" : "▸"} Pozostałe (szkice, odrzucone, zrealizowane) ·{" "}
              {archive.length}
            </button>
            {showArchive ? (
              <div className="grid gap-3">
                {archive.length === 0 ? (
                  <Card>
                    <CardContent className="py-4 text-sm text-muted">Brak pozycji.</CardContent>
                  </Card>
                ) : (
                  archive.map((entry) => renderCard(entry))
                )}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
