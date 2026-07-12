"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { TimeEntryFormDialog } from "@/components/time-tracking/time-entry-form-dialog";
import { TimeEntryList } from "@/components/time-tracking/time-entry-list";
import {
  endOfWeekSunday,
  formatDurationMinutes,
  startOfWeekMonday,
  toDateInputValue,
} from "@/lib/time-tracking/format";
import type { TimeEntryView } from "@/lib/time-tracking/types";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

function shiftWeek(dateFrom: string, direction: -1 | 1) {
  const start = new Date(`${dateFrom}T12:00:00`);
  start.setDate(start.getDate() + direction * 7);
  const monday = startOfWeekMonday(start);
  const sunday = endOfWeekSunday(monday);
  return {
    dateFrom: toDateInputValue(monday),
    dateTo: toDateInputValue(sunday),
  };
}

export function TimeTrackingPage() {
  const entries = useTimeTrackingStore((state) => state.entries);
  const entriesHydrated = useTimeTrackingStore((state) => state.entriesHydrated);
  const entriesLoading = useTimeTrackingStore((state) => state.entriesLoading);
  const filters = useTimeTrackingStore((state) => state.filters);
  const ensureMeta = useTimeTrackingStore((state) => state.ensureMeta);
  const ensureEntries = useTimeTrackingStore((state) => state.ensureEntries);
  const setFilters = useTimeTrackingStore((state) => state.setFilters);
  const removeEntry = useTimeTrackingStore((state) => state.removeEntry);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryView | null>(null);

  useEffect(() => {
    void ensureMeta();
    void ensureEntries();
  }, [ensureMeta, ensureEntries]);

  useEffect(() => {
    void ensureEntries({ force: true, showLoading: false });
  }, [filters.dateFrom, filters.dateTo, ensureEntries]);

  const weekTotalMinutes = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
    [entries],
  );

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
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Dodaj czas
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Tydzień od">
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(event) => setFilters({ dateFrom: event.target.value })}
                />
              </Field>
              <Field label="Tydzień do">
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(event) => setFilters({ dateTo: event.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filters.dateFrom) {
                    setFilters(shiftWeek(filters.dateFrom, -1));
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const monday = startOfWeekMonday(new Date());
                  const sunday = endOfWeekSunday(monday);
                  setFilters({
                    dateFrom: toDateInputValue(monday),
                    dateTo: toDateInputValue(sunday),
                  });
                }}
              >
                Bieżący tydzień
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filters.dateFrom) {
                    setFilters(shiftWeek(filters.dateFrom, 1));
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:min-w-[220px]">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted">Suma tygodnia</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatDurationMinutes(weekTotalMinutes)}
            </p>
            <p className="mt-1 text-xs text-muted">{entries.length} wpisów</p>
          </CardContent>
        </Card>
      </div>

      {entriesLoading && !entriesHydrated ? (
        <p className="text-sm text-muted">Wczytywanie wpisów czasu…</p>
      ) : (
        <TimeEntryList entries={entries} onEdit={openEdit} onDelete={handleDelete} />
      )}

      <TimeEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editingEntry}
        defaultDate={today}
      />
    </>
  );
}
