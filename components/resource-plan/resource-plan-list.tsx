"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/auth/types";
import { resolveDictionaryIcon } from "@/lib/resource-plan/icon-options";
import { resourcePlanItemToInput, type ResourcePlanItem } from "@/lib/resource-plan/types";
import { validateResourcePlanItem } from "@/lib/resource-plan/validations";
import { useAppStore } from "@/store/app-store";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useProcessStore } from "@/store/process-store";
import { useResourcePlanStore } from "@/store/resource-plan-store";
import { useUserResourceStore } from "@/store/user-resource-store";
import { ResourcePlanSidePanel } from "@/components/resource-plan/resource-plan-side-panel";

function startOfMonthIso(offsetMonths = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offsetMonths);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfMonthIso(offsetMonths = 0) {
  const date = startOfMonthIso(offsetMonths);
  date.setMonth(date.getMonth() + 1);
  date.setMilliseconds(-1);
  return date;
}

function formatRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit" });
  const timeFmt = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${dateFmt.format(start)} · ${timeFmt.format(start)}–${timeFmt.format(end)}`
    : `${dateFmt.format(start)} ${timeFmt.format(start)} → ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

export function ResourcePlanList() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourcePlanItem | null>(null);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>(undefined);

  const from = startOfMonthIso(monthOffset).toISOString();
  const to = endOfMonthIso(monthOffset).toISOString();

  const ensureRange = useResourcePlanStore((state) => state.ensureRange);
  const loading = useResourcePlanStore((state) => state.loading);
  const items = useResourcePlanStore((state) => state.allItems());

  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const dictionaryItems = useDictionaryStore((state) => state.items);
  const statusOptions = useDictionaryStore((state) => state.byKey("plan_status"));
  const riskOptions = useDictionaryStore((state) => state.byKey("risk_level"));
  const workTypeOptions = useDictionaryStore((state) => state.byKey("work_type"));
  const teamOptions = useDictionaryStore((state) => state.byKey("team"));
  const templateOptions = useDictionaryStore((state) => state.byKey("plan_item_template"));

  const ensureProfiles = useUserResourceStore((state) => state.ensureProfiles);
  const resourceProfilesById = useUserResourceStore((state) => state.byUser);

  useEffect(() => {
    void ensureDictionaries();
    void loadTeamProfiles();
  }, [ensureDictionaries, loadTeamProfiles]);

  useEffect(() => {
    void ensureRange(from, to);
  }, [ensureRange, from, to]);

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => item.startAt < to && item.endAt > from)
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [items, from, to],
  );

  useEffect(() => {
    const ids = new Set<string>();
    visibleItems.forEach((item) => {
      if (item.assigneeId) ids.add(item.assigneeId);
      item.participants.forEach((p) => ids.add(p.userId));
    });
    if (ids.size > 0) void ensureProfiles([...ids]);
  }, [visibleItems, ensureProfiles]);

  const profilesById = useMemo(() => Object.fromEntries(teamProfiles.map((p) => [p.id, p])), [teamProfiles]);

  // Grupy podzielonych przydziałów (patrz splitResourcePlanItem) — do plakietki "część X/Y".
  const linkedGroupMembersById = useMemo(() => {
    const map = new Map<string, ResourcePlanItem[]>();
    items.forEach((item) => {
      if (!item.linkedGroupId) return;
      const list = map.get(item.linkedGroupId) ?? [];
      list.push(item);
      map.set(item.linkedGroupId, list);
    });
    map.forEach((list) => list.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    return map;
  }, [items]);

  // Ostrzeżenia liczone poza panelem edycji — plakietka na karcie listy (Etap 5, patrz ARCHITEKTURA.md §6).
  // Bez kontekstu etapu procesu (`stage: null`), tak jak w Gantcie — nie ładujemy tu snapshotu procesu per wiersz.
  const warningsByItemId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateResourcePlanItem>>();
    visibleItems.forEach((item) => {
      map.set(
        item.id,
        validateResourcePlanItem({
          input: resourcePlanItemToInput(item),
          editingId: item.id,
          otherItems: items,
          stage: null,
          profilesById,
          resourceProfilesById,
          dictionaryItems,
        }),
      );
    });
    return map;
  }, [visibleItems, items, profilesById, resourceProfilesById, dictionaryItems]);

  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    startOfMonthIso(monthOffset),
  );

  function openCreate(templateId?: string) {
    setEditingItem(null);
    setInitialTemplateId(templateId);
    setPanelOpen(true);
  }

  function openEdit(item: ResourcePlanItem) {
    setEditingItem(item);
    setInitialTemplateId(undefined);
    setPanelOpen(true);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonthOffset((v) => v - 1)}>
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Poprzedni</span>
          </Button>
          <span className="min-w-[120px] flex-1 text-center text-sm font-medium capitalize text-foreground sm:flex-none">
            {monthLabel}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonthOffset((v) => v + 1)}>
            <span className="hidden sm:inline">Następny</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
          {monthOffset !== 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setMonthOffset(0)}>
              Dziś
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {templateOptions.length > 0 ? (
            <Select
              value=""
              className="h-9 w-full sm:w-auto"
              onChange={(event) => {
                const templateId = event.target.value;
                if (templateId) openCreate(templateId);
              }}
            >
              <option value="">Szybko z szablonu…</option>
              {templateOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Button type="button" className="w-full sm:w-auto" onClick={() => openCreate()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nowy element planu
          </Button>
        </div>
      </div>

      {loading && visibleItems.length === 0 ? (
        <p className="text-sm text-muted">Ładowanie planu…</p>
      ) : visibleItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            Brak zaplanowanych elementów w tym miesiącu.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {visibleItems.map((item) => {
            const project = projects.find((p) => p.id === item.projectId);
            const client = clients.find((c) => c.id === item.clientId);
            const assignee = teamProfiles.find((p) => p.id === item.assigneeId);
            const status = statusOptions.find((s) => s.id === item.statusItemId);
            const risk = riskOptions.find((r) => r.id === item.riskItemId);
            const workType = workTypeOptions.find((w) => w.id === item.workTypeItemId);
            const team = teamOptions.find((t) => t.id === item.teamItemId);
            const StatusIcon = resolveDictionaryIcon(status?.icon);
            const RiskIcon = resolveDictionaryIcon(risk?.icon);
            const warnings = warningsByItemId.get(item.id) ?? [];
            const hasDanger = warnings.some((w) => w.severity === "danger");
            const groupMembers = item.linkedGroupId ? linkedGroupMembersById.get(item.linkedGroupId) ?? [item] : null;
            const groupBadge =
              groupMembers && groupMembers.length > 1
                ? `${groupMembers.findIndex((m) => m.id === item.id) + 1}/${groupMembers.length}`
                : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openEdit(item)}
                className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface p-3 text-left transition hover:bg-surface-muted/40"
              >
                <span
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: status?.color ?? "#64748b" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {item.title || project?.name || "Element planu"}
                    {groupBadge ? (
                      <span
                        className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted"
                        title="Część podzielonego przydziału"
                      >
                        część {groupBadge}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[project?.name, client?.fullName, workType?.name].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="shrink-0 text-xs text-muted">{formatRange(item.startAt, item.endAt)}</div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {status ? (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${status.color}22`, color: status.color }}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.name}
                    </span>
                  ) : null}
                  {risk ? (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${risk.color}22`, color: risk.color }}
                    >
                      <RiskIcon className="h-3 w-3" />
                      {risk.name}
                    </span>
                  ) : null}
                  {team ? (
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-xs text-muted">{team.name}</span>
                  ) : null}
                  {warnings.length > 0 ? (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                        hasDanger ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300",
                      )}
                      title={warnings.map((w) => w.message).join("\n")}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {warnings.length}
                    </span>
                  ) : null}
                </div>
                <div className="shrink-0 max-w-[10rem] truncate text-xs text-muted">
                  {assignee ? getUserDisplayName(assignee) : "Brak osoby"}
                  {item.participants.length > 0 ? ` +${item.participants.length}` : ""}
                </div>
                <Pencil className="h-4 w-4 shrink-0 text-muted" />
              </button>
            );
          })}
        </div>
      )}

      <ResourcePlanSidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        editingItem={editingItem}
        initialTemplateId={initialTemplateId}
        onSaved={() => setPanelOpen(false)}
      />
    </div>
  );
}
