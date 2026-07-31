"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAllowedHomeWidgets,
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

  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    const ids = resolveHomeWidgetIds(profile.role, profile.homeWidgets, navConfig);
    setSelected(new Set(ids));
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
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/account/home-widgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetIds: Array.from(selected) }),
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
                    checked={selected.has(widget.id)}
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
