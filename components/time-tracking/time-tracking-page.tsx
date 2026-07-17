"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { TimeEntryFormDialog } from "@/components/time-tracking/time-entry-form-dialog";
import { TimeEntryHistoryDialog } from "@/components/time-tracking/time-entry-history-dialog";
import { TimeEntryList } from "@/components/time-tracking/time-entry-list";
import { TimeTimerPanel } from "@/components/time-tracking/time-timer-panel";
import { TimeTimesheetApprovalPanel } from "@/components/time-tracking/time-timesheet-approval-panel";
import { TimeTimesheetPanel } from "@/components/time-tracking/time-timesheet-panel";
import { TimeWeekReport } from "@/components/time-tracking/time-week-report";
import {
  formatTimesheetPeriodLabel,
  resolveTimesheetPeriod,
  shiftTimesheetPeriod,
} from "@/lib/time-tracking/timesheet-period";
import { TIMESHEET_PERIOD_LABELS, type TimesheetPeriodType } from "@/lib/time-tracking/types";
import { formatDurationMinutes, toDateInputValue } from "@/lib/time-tracking/format";
import type { TimeEntryView } from "@/lib/time-tracking/types";
import { useAuthStore } from "@/store/auth-store";
import { useCanViewTeamTimeEntries, useTimeTrackingStore } from "@/store/time-tracking-store";

export function TimeTrackingPage() {
  const entries = useTimeTrackingStore((state) => state.entries);
  const entriesHydrated = useTimeTrackingStore((state) => state.entriesHydrated);
  const entriesLoading = useTimeTrackingStore((state) => state.entriesLoading);
  const filters = useTimeTrackingStore((state) => state.filters);
  const entriesPeriod = useTimeTrackingStore((state) => state.entriesPeriod);
  const ensureMeta = useTimeTrackingStore((state) => state.ensureMeta);
  const ensureEntries = useTimeTrackingStore((state) => state.ensureEntries);
  const setEntriesPeriod = useTimeTrackingStore((state) => state.setEntriesPeriod);
  const removeEntry = useTimeTrackingStore((state) => state.removeEntry);
  const currentTimesheet = useTimeTrackingStore((state) => state.currentTimesheet);
  const timesheetLoading = useTimeTrackingStore((state) => state.timesheetLoading);
  const ensureCurrentTimesheet = useTimeTrackingStore((state) => state.ensureCurrentTimesheet);
  const submitCurrentTimesheet = useTimeTrackingStore((state) => state.submitCurrentTimesheet);
  const pendingTimesheets = useTimeTrackingStore((state) => state.pendingTimesheets);
  const pendingTimesheetsLoading = useTimeTrackingStore((state) => state.pendingTimesheetsLoading);
  const ensurePendingTimesheets = useTimeTrackingStore((state) => state.ensurePendingTimesheets);
  const approveTimesheetById = useTimeTrackingStore((state) => state.approveTimesheetById);
  const rejectTimesheetById = useTimeTrackingStore((state) => state.rejectTimesheetById);

  const role = useAuthStore((state) => state.profile?.role);
  const canManageTeam = useCanViewTeamTimeEntries(role);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryView | null>(null);
  const [historyEntry, setHistoryEntry] = useState<TimeEntryView | null>(null);

  useEffect(() => {
    void ensureMeta();
    void ensureEntries();
    void useTimeTrackingStore.getState().ensureTimer();
    void ensureCurrentTimesheet();
    if (canManageTeam) {
      void ensurePendingTimesheets();
    }
  }, [ensureMeta, ensureEntries, ensureCurrentTimesheet, ensurePendingTimesheets, canManageTeam]);

  useEffect(() => {
    void ensureEntries({ force: true, showLoading: false });
    void ensureCurrentTimesheet({ force: true, showLoading: false });
    if (canManageTeam) {
      void ensurePendingTimesheets({ force: true, showLoading: false });
    }
  }, [filters.dateFrom, filters.dateTo, ensureEntries, ensureCurrentTimesheet, ensurePendingTimesheets, canManageTeam]);

  const periodTotalMinutes = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
    [entries],
  );

  const periodLabel = formatTimesheetPeriodLabel(entriesPeriod);
  const periodSumLabel = entriesPeriod.periodType === "month" ? "Suma miesiąca" : "Suma tygodnia";

  function setPeriodType(periodType: TimesheetPeriodType) {
    setEntriesPeriod(resolveTimesheetPeriod(periodType));
  }

  function jumpToCurrentPeriod() {
    setEntriesPeriod(resolveTimesheetPeriod(entriesPeriod.periodType));
  }

  const today = toDateInputValue(new Date());

  function openCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEdit(entry: TimeEntryView) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  async function handleDelete(entry: TimeEntryView) {
    if (!window.confirm("Usunąć ten wpis czasu?")) {
      return;
    }
    try {
      await removeEntry(entry.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się usunąć wpisu.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Moja praca"
        title="Czas pracy"
        description="Rejestruj wykonany czas — jedno centralne miejsce ewidencji godzin pracy."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/moja-praca/czas-pracy/arkusz">Arkusz czasu</Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Dodaj czas
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4">
        <TimeTimerPanel />
        <TimeTimesheetPanel
          timesheet={currentTimesheet}
          loading={timesheetLoading}
          onSubmit={async (employeeComment) => {
            await submitCurrentTimesheet({ employeeComment });
          }}
        />
        {canManageTeam ? (
          <TimeTimesheetApprovalPanel
            timesheets={pendingTimesheets}
            loading={pendingTimesheetsLoading}
            onApprove={async (id) => {
              await approveTimesheetById(id);
            }}
            onReject={async (id, input) => {
              await rejectTimesheetById(id, input);
            }}
          />
        ) : null}
        <TimeWeekReport entries={entries} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
              <Field label="Okres">
                <Select
                  value={entriesPeriod.periodType}
                  onChange={(event) => setPeriodType(event.target.value as TimesheetPeriodType)}
                >
                  {Object.entries(TIMESHEET_PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Zakres">
                <p className="flex h-10 items-center rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground">
                  {periodLabel}
                </p>
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEntriesPeriod(shiftTimesheetPeriod(entriesPeriod, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={jumpToCurrentPeriod}>
                Bieżący {TIMESHEET_PERIOD_LABELS[entriesPeriod.periodType].toLowerCase()}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEntriesPeriod(shiftTimesheetPeriod(entriesPeriod, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:min-w-[220px]">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted">{periodSumLabel}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatDurationMinutes(periodTotalMinutes)}
            </p>
            <p className="mt-1 text-xs text-muted">{entries.length} wpisów</p>
          </CardContent>
        </Card>
      </div>

      {entriesLoading && !entriesHydrated ? (
        <p className="text-sm text-muted">Wczytywanie wpisów czasu…</p>
      ) : (
        <TimeEntryList
          entries={entries}
          onEdit={openEdit}
          onDelete={handleDelete}
          onHistory={(entry) => setHistoryEntry(entry)}
        />
      )}

      <TimeEntryHistoryDialog
        open={Boolean(historyEntry)}
        onOpenChange={(open) => {
          if (!open) setHistoryEntry(null);
        }}
        entryId={historyEntry?.id ?? null}
        entryLabel={
          historyEntry
            ? `${historyEntry.categoryName} · ${formatDurationMinutes(historyEntry.durationMinutes)}`
            : ""
        }
      />

      <TimeEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editingEntry}
        defaultDate={today}
      />
    </>
  );
}
