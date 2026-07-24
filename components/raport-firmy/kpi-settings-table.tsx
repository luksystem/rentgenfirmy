"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateReportKpiConfigAdmin } from "@/lib/supabase/report-kpi-config-repository";
import type { ComparisonPeriodKind, ReportKpiConfigRow } from "@/lib/report-kpi/types";

const PERIOD_LABELS: Record<ComparisonPeriodKind, string> = {
  none: "Brak (stan bieżący)",
  day: "Dzień do dnia",
  week: "Tydzień do tygodnia",
  month: "Miesiąc do miesiąca",
  quarter: "Kwartał do kwartału",
  year: "Rok do roku",
};

const DOMAIN_LABELS: Record<string, string> = {
  team: "Zespół i czas",
  growth: "Ocena i rozwój",
  sales: "Sprzedaż i cashflow",
  service: "Serwis",
  budget: "Budżet firmy",
};

function KpiRow({ row, onSaved }: { row: ReportKpiConfigRow; onSaved: (row: ReportKpiConfigRow) => void }) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(row);

  async function save(patch: Partial<ReportKpiConfigRow>) {
    const next = { ...local, ...patch };
    setLocal(next);
    setSaving(true);
    try {
      const saved = await updateReportKpiConfigAdmin(row.kpiKey, {
        enabled: patch.enabled,
        warningThreshold: patch.warningThreshold,
        criticalThreshold: patch.criticalThreshold,
        comparisonPeriod: patch.comparisonPeriod,
        sortOrder: patch.sortOrder,
      });
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className={local.enabled ? undefined : "opacity-50"}>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={local.enabled}
          onChange={(event) => void save({ enabled: event.target.checked })}
          className="h-4 w-4 accent-accent"
        />
      </td>
      <td className="py-2 pr-3 font-medium text-foreground">{local.label}</td>
      <td className="py-2 pr-3">
        <select
          className="rounded-md border border-border bg-surface-muted px-2 py-1 text-sm"
          value={local.comparisonPeriod}
          disabled={!local.enabled}
          onChange={(event) => void save({ comparisonPeriod: event.target.value as ComparisonPeriodKind })}
        >
          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          className="w-20 rounded-md border border-border bg-surface-muted px-2 py-1 text-sm"
          value={local.warningThreshold ?? ""}
          disabled={!local.enabled}
          placeholder="—"
          onChange={(event) =>
            void save({ warningThreshold: event.target.value === "" ? null : Number(event.target.value) })
          }
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          className="w-20 rounded-md border border-border bg-surface-muted px-2 py-1 text-sm"
          value={local.criticalThreshold ?? ""}
          disabled={!local.enabled}
          placeholder="—"
          onChange={(event) =>
            void save({ criticalThreshold: event.target.value === "" ? null : Number(event.target.value) })
          }
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          className="w-16 rounded-md border border-border bg-surface-muted px-2 py-1 text-sm"
          value={local.sortOrder}
          disabled={!local.enabled}
          onChange={(event) => void save({ sortOrder: Number(event.target.value) })}
        />
      </td>
      <td className="py-2 text-xs text-muted">{saving ? "Zapisywanie..." : null}</td>
    </tr>
  );
}

export function KpiSettingsTable({ items }: { items: ReportKpiConfigRow[] }) {
  const [rows, setRows] = useState(items);
  const domains = [...new Set(rows.map((row) => row.domain))];

  function handleSaved(saved: ReportKpiConfigRow) {
    setRows((prev) => prev.map((row) => (row.kpiKey === saved.kpiKey ? saved : row)));
  }

  return (
    <div className="grid gap-4">
      {domains.map((domain) => (
        <Card key={domain}>
          <CardHeader>
            <CardTitle>{DOMAIN_LABELS[domain] ?? domain}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3">Widoczny</th>
                  <th className="pb-2 pr-3">Wskaźnik</th>
                  <th className="pb-2 pr-3">Okres odniesienia</th>
                  <th className="pb-2 pr-3">Próg ostrzegawczy</th>
                  <th className="pb-2 pr-3">Próg krytyczny</th>
                  <th className="pb-2 pr-3">Kolejność</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) => row.domain === domain)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((row) => (
                    <KpiRow key={row.kpiKey} row={row} onSaved={handleSaved} />
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
