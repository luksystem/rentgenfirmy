"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ExternalLink, Loader2 } from "lucide-react";
import { InspectionPlanWizard } from "@/components/inspections/inspection-plan-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { INSPECTION_STATUS_LABELS, type InspectionRecord } from "@/lib/inspections/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function ClientInspectionsPanel({
  client,
  projects,
}: {
  client: Client;
  projects: Project[];
}) {
  const [items, setItems] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inspections?clientId=${client.id}`, {
        credentials: "include",
      });
      const payload = await response.json();
      if (response.ok) {
        setItems(payload.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftDate = left.confirmedDate ?? left.preliminaryDate ?? left.createdAt;
        const rightDate = right.confirmedDate ?? right.preliminaryDate ?? right.createdAt;
        return leftDate.localeCompare(rightDate);
      }),
    [items],
  );

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie przeglądów…
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Cykliczne przeglądy serwisowe dla <strong className="text-foreground">{client.fullName}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setPlanOpen(true)}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Zaplanuj przeglądy
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/przeglady">
              <ExternalLink className="mr-2 h-4 w-4" />
              Tablica przeglądów
            </Link>
          </Button>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak zaplanowanych przeglądów dla tego klienta.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {sortedItems.map((item) => (
            <li key={item.id}>
              <Link
                href="/przeglady"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/20 px-4 py-3 transition hover:border-accent/30"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.systemLabel}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.confirmedDate
                      ? `Termin: ${formatDate(item.confirmedDate)}`
                      : item.preliminaryDate
                        ? `Wstępnie: ${formatDate(item.preliminaryDate)}`
                        : "Bez daty"}
                    {item.projectName ? ` · ${item.projectName}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    item.status === "billing"
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                      : item.status === "planned"
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                        : "border-border/70 text-muted",
                  )}
                >
                  {INSPECTION_STATUS_LABELS[item.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <InspectionPlanWizard
        open={planOpen}
        client={client}
        projects={projects}
        onClose={() => setPlanOpen(false)}
        onSuccess={() => {
          setPlanOpen(false);
          void loadItems();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inspections-count-changed"));
            window.dispatchEvent(new CustomEvent("inspections-reload"));
          }
        }}
      />
    </>
  );
}
