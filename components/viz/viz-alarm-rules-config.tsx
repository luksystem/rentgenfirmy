"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  VIZ_ALARM_CONDITIONS,
  VIZ_ALARM_CONDITION_LABELS,
  VIZ_ALARM_SEVERITIES,
  type VizAlarmRule,
  type VizAlarmSeverity,
} from "@/lib/viz/project-contact-types";
import type { VizDashboardProject } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

type VizAlarmRulesConfigProps = {
  dashboardId: string;
};

export function VizAlarmRulesConfig({ dashboardId }: VizAlarmRulesConfigProps) {
  const variableRoles = useVizStore((s) => s.variableRoles);
  const ensureViz = useVizStore((s) => s.hydrate);

  const [rules, setRules] = useState<VizAlarmRule[]>([]);
  const [projects, setProjects] = useState<VizDashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [roleCode, setRoleCode] = useState("store_temperature");
  const [projectId, setProjectId] = useState("");
  const [condition, setCondition] = useState<(typeof VIZ_ALARM_CONDITIONS)[number]>("gt");
  const [thresholdNumeric, setThresholdNumeric] = useState("");
  const [severity, setSeverity] = useState<VizAlarmSeverity>("alarm");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rulesRes, projectsRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/alarms`),
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=projects`),
      ]);

      if (!rulesRes.ok || !projectsRes.ok) {
        throw new Error("Nie udało się pobrać reguł alarmów.");
      }

      const rulesData = (await rulesRes.json()) as { rules: VizAlarmRule[] };
      const projectsData = (await projectsRes.json()) as { projects: VizDashboardProject[] };
      setRules(rulesData.rules);
      setProjects(projectsData.projects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void ensureViz();
    void loadData();
  }, [ensureViz, loadData]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/alarms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          roleCode,
          projectId: projectId || null,
          condition,
          thresholdNumeric: Number(thresholdNumeric),
          severity,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się dodać reguły.");
      }

      setName("");
      setThresholdNumeric("");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    if (!window.confirm("Usunąć tę regułę alarmu?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/alarms?id=${encodeURIComponent(ruleId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć reguły.");
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie reguł…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Nowa reguła alarmu / progu</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Nazwa reguły</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Rola zmiennej</label>
            <select
              className={selectClassName}
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
            >
              {variableRoles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Sklep (opcjonalnie)</label>
            <select
              className={selectClassName}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Wszystkie sklepy dashboardu</option>
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.displayName ?? project.projectName ?? project.projectId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Warunek</label>
            <select
              className={selectClassName}
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as (typeof VIZ_ALARM_CONDITIONS)[number])
              }
            >
              {VIZ_ALARM_CONDITIONS.map((item) => (
                <option key={item} value={item}>
                  {VIZ_ALARM_CONDITION_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Próg</label>
            <Input
              type="number"
              step="any"
              value={thresholdNumeric}
              onChange={(e) => setThresholdNumeric(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ważność</label>
            <select
              className={selectClassName}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as VizAlarmSeverity)}
            >
              {VIZ_ALARM_SEVERITIES.map((item) => (
                <option key={item} value={item}>
                  {item === "alarm" ? "Alarm" : "Ostrzeżenie"}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSaving || !thresholdNumeric}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Dodaj regułę
            </Button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      {!rules.length ? (
        <Card className="p-6 text-sm text-muted">Brak reguł — status opiera się tylko na telemetrii Loxone.</Card>
      ) : (
        rules.map((rule) => (
          <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <p className="font-medium">{rule.name}</p>
              <p className="text-muted">
                {rule.roleCode} {VIZ_ALARM_CONDITION_LABELS[rule.condition]} {rule.thresholdNumeric}
                {" · "}
                {rule.severity === "alarm" ? "Alarm" : "Ostrzeżenie"}
                {rule.projectId ? " · sklep specyficzny" : " · wszystkie sklepy"}
              </p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => void handleDelete(rule.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))
      )}
    </div>
  );
}
