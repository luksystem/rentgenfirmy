"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchXpCriteriaAdmin, updateXpCriterionAdmin } from "@/lib/supabase/xp-repository";
import type { XpCriterion } from "@/lib/xp/types";

function CriterionRow({ criterion }: { criterion: XpCriterion }) {
  const [points, setPoints] = useState(criterion.points);
  const [isActive, setIsActive] = useState(criterion.isActive);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleBlurOrToggle(nextPoints: number, nextActive: boolean) {
    setSaving(true);
    setSaved(false);
    try {
      await updateXpCriterionAdmin(criterion.id, { points: nextPoints, isActive: nextActive });
      setSaved(true);
    } catch {
      // Błąd zapisu — wartość i tak zostaje w formularzu, admin może spróbować ponownie.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-surface-muted/10 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{criterion.label}</p>
        <p className="text-xs text-muted">{criterion.description}</p>
      </div>
      <Input
        type="number"
        value={points}
        onChange={(event) => setPoints(Number(event.target.value))}
        onBlur={() => void handleBlurOrToggle(points, isActive)}
        className="h-9 w-20"
      />
      <label className="flex items-center gap-1.5 text-xs text-foreground/90">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => {
            setIsActive(event.target.checked);
            void handleBlurOrToggle(points, event.target.checked);
          }}
          className="h-4 w-4 rounded border-border"
        />
        Aktywne
      </label>
      {saving ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted" /> : null}
      {saved && !saving ? <span className="shrink-0 text-xs text-emerald-400">Zapisano</span> : null}
    </div>
  );
}

export function XpCriteriaEditor() {
  const [criteria, setCriteria] = useState<XpCriterion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchXpCriteriaAdmin()
      .then(setCriteria)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardContent className="grid gap-3 pt-6">
        <p className="text-sm font-semibold text-foreground">Kryteria XP</p>
        {loading ? (
          <p className="text-sm text-muted">Wczytywanie…</p>
        ) : (
          <div className="grid gap-2">
            {criteria.map((criterion) => (
              <CriterionRow key={criterion.id} criterion={criterion} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
