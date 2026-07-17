"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { PlanTimeSuggestion } from "@/lib/time-tracking/types";
import { useTimeTrackingStore } from "@/store/time-tracking-store";
import { cn } from "@/lib/utils";

function formatSuggestionDuration(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} h`;
  }
  return formatDurationMinutes(minutes);
}

export function TimePlanSuggestionsPanel() {
  const planSuggestions = useTimeTrackingStore((state) => state.planSuggestions);
  const planSuggestionsLoading = useTimeTrackingStore((state) => state.planSuggestionsLoading);
  const planSuggestionsHydrated = useTimeTrackingStore((state) => state.planSuggestionsHydrated);
  const entriesPeriod = useTimeTrackingStore((state) => state.entriesPeriod);
  const ensurePlanSuggestions = useTimeTrackingStore((state) => state.ensurePlanSuggestions);
  const acceptPlanSuggestions = useTimeTrackingStore((state) => state.acceptPlanSuggestions);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    void ensurePlanSuggestions();
  }, [ensurePlanSuggestions, entriesPeriod.dateFrom, entriesPeriod.dateTo]);

  useEffect(() => {
    setSelectedKeys(new Set(planSuggestions.map((item) => item.key)));
  }, [planSuggestions]);

  const totalMinutes = useMemo(
    () =>
      planSuggestions
        .filter((item) => selectedKeys.has(item.key))
        .reduce((sum, item) => sum + item.durationMinutes, 0),
    [planSuggestions, selectedKeys],
  );

  const loading = planSuggestionsLoading && !planSuggestionsHydrated;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">Wczytywanie propozycji z planu zasobów…</CardContent>
      </Card>
    );
  }

  if (planSuggestions.length === 0) {
    return null;
  }

  function toggleKey(key: string) {
    setSelectedKeys((state) => {
      const next = new Set(state);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleAccept(items: PlanTimeSuggestion[]) {
    if (items.length === 0) {
      return;
    }

    setAccepting(true);
    try {
      await acceptPlanSuggestions({
        suggestions: items.map((item) => ({
          resourcePlanItemId: item.resourcePlanItemId,
          date: item.date,
        })),
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się zaakceptować propozycji.");
    } finally {
      setAccepting(false);
    }
  }

  const selectedItems = planSuggestions.filter((item) => selectedKeys.has(item.key));

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-accent" aria-hidden />
              <p className="text-sm font-medium text-foreground">Propozycje z planu zasobów</p>
              <Badge tone="waiting">{planSuggestions.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted">
              Godziny wyliczone z Twoich przydziałów w planie. Zaakceptuj, aby utworzyć wpisy robocze (szkic).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={accepting || selectedItems.length === 0}
              onClick={() => void handleAccept(selectedItems)}
            >
              Zaakceptuj zaznaczone ({selectedItems.length})
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={accepting || planSuggestions.length === 0}
              onClick={() => void handleAccept(planSuggestions)}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Zaakceptuj wszystkie
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-surface-muted/30 text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-10 px-3 py-2" aria-label="Zaznacz" />
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Przydział</th>
                <th className="px-3 py-2 font-medium">Projekt</th>
                <th className="px-3 py-2 text-right font-medium">Czas</th>
              </tr>
            </thead>
            <tbody>
              {planSuggestions.map((item) => {
                const checked = selectedKeys.has(item.key);
                return (
                  <tr
                    key={item.key}
                    className={cn(
                      "border-b border-border/40 transition hover:bg-surface-muted/30",
                      checked && "bg-accent/5",
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={checked}
                        onChange={() => toggleKey(item.key)}
                        aria-label={`Zaznacz propozycję ${item.title}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-foreground">{item.date}</td>
                    <td className="px-3 py-2 text-foreground">{item.title}</td>
                    <td className="px-3 py-2 text-muted">{item.projectName ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {formatSuggestionDuration(item.durationMinutes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted">
          Suma zaznaczonych: <span className="font-medium text-foreground">{formatDurationMinutes(totalMinutes)}</span>
        </p>
      </CardContent>
    </Card>
  );
}
