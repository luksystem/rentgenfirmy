"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moveItem } from "@/lib/process/template-editor-utils";
import {
  getAllowedHomeWidgets,
  getHomeWidgetDefinition,
  HOME_WIDGET_CATEGORY_LABELS,
  resolveHomeWidgetIds,
  type HomeWidgetCategory,
} from "@/lib/home-widgets/registry";
import { useAuthStore } from "@/store/auth-store";
import { useRoleNavPermissionsStore } from "@/store/role-nav-permissions-store";

const CATEGORY_ORDER: HomeWidgetCategory[] = ["ogolne", "finanse", "projekty", "moja-praca"];

export function HomeWidgetsSettings() {
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const navConfig = useRoleNavPermissionsStore((state) => state.config);
  const navHydrated = useRoleNavPermissionsStore((state) => state.hydrated);
  const hydrateNavConfig = useRoleNavPermissionsStore((state) => state.hydrate);

  /** Tablica = zarówno wybór, jak i kolejność wyświetlania na stronie głównej. */
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void hydrateNavConfig();
  }, [hydrateNavConfig]);

  const allowedWidgets = useMemo(
    () => (profile ? getAllowedHomeWidgets(profile.role, navConfig) : []),
    [profile, navConfig],
  );

  useEffect(() => {
    if (!profile || !navHydrated) {
      return;
    }
    setOrderedIds(resolveHomeWidgetIds(profile.role, profile.homeWidgets, navConfig));
  }, [profile, navConfig, navHydrated]);

  const grouped = useMemo(() => {
    const map = new Map<HomeWidgetCategory, typeof allowedWidgets>();
    for (const widget of allowedWidgets) {
      const list = map.get(widget.category) ?? [];
      list.push(widget);
      map.set(widget.category, list);
    }
    return map;
  }, [allowedWidgets]);

  function toggle(id: string) {
    setOrderedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  function move(index: number, direction: "up" | "down") {
    setOrderedIds((current) => moveItem(current, index, direction));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/account/home-widgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetIds: orderedIds }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać widżetów.");
      }
      await refreshProfile();
      setSuccess("Zapisano widżety strony głównej.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać widżetów.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !allowedWidgets.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Widżety strony głównej</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted">
          Wybierz, co ma się wyświetlać na Twojej stronie głównej. Lista pokazuje tylko widżety, do
          których masz dostęp.
        </p>

        {CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => (
          <div key={category} className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {HOME_WIDGET_CATEGORY_LABELS[category]}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(grouped.get(category) ?? []).map((widget) => (
                <label
                  key={widget.id}
                  className="flex items-start gap-2 rounded-xl border border-border/70 bg-surface-muted/10 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border bg-surface text-accent"
                    checked={orderedIds.includes(widget.id)}
                    onChange={() => toggle(widget.id)}
                  />
                  <span>
                    <span className="font-medium text-foreground">{widget.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{widget.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Kolejność na stronie głównej
          </p>
          {orderedIds.length ? (
            <div className="grid gap-1.5">
              {orderedIds.map((id, index) => {
                const widget = getHomeWidgetDefinition(id);
                if (!widget) {
                  return null;
                }
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-muted/10 px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{widget.label}</span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={index === 0}
                        onClick={() => move(index, "up")}
                        aria-label="Przesuń w górę"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={index === orderedIds.length - 1}
                        onClick={() => move(index, "down")}
                        aria-label="Przesuń w dół"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">Nie wybrano jeszcze żadnego widżetu.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Zapisywanie…" : "Zapisz widżety"}
          </Button>
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
