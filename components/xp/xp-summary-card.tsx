import { Card, CardContent } from "@/components/ui/card";
import { xpIcon } from "@/components/xp/xp-icon-map";
import type { XpEmployeeSummary } from "@/lib/xp/types";
import { cn } from "@/lib/utils";

export function XpSummaryCard({ summary }: { summary: XpEmployeeSummary }) {
  const LevelIcon = xpIcon(summary.level.icon);
  const progressPercent =
    summary.level.pointsForNextLevel && summary.level.pointsForNextLevel > 0
      ? Math.min(100, Math.round((summary.level.pointsIntoLevel / summary.level.pointsForNextLevel) * 100))
      : 100;

  return (
    <Card>
      <CardContent className="grid gap-5 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <LevelIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-semibold text-foreground">{summary.totalPoints} XP</p>
            <p className="text-sm text-muted">
              Poziom {summary.level.tier} — {summary.level.label}
            </p>
          </div>
        </div>

        <div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {summary.level.pointsForNextLevel
              ? `${summary.level.pointsIntoLevel} / ${summary.level.pointsForNextLevel} pkt do kolejnego poziomu`
              : "Najwyższy poziom osiągnięty"}
          </p>
        </div>

        {summary.breakdown.length ? (
          <div className="grid gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Wg kategorii</p>
            {summary.breakdown.map(({ category, points }) => {
              const CategoryIcon = xpIcon(category.icon);
              const maxAbs = Math.max(...summary.breakdown.map((entry) => Math.abs(entry.points)), 1);
              const widthPercent = Math.max(4, Math.round((Math.abs(points) / maxAbs) * 100));
              return (
                <div key={category.id} className="grid gap-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground/90">
                      <CategoryIcon className="h-3.5 w-3.5" style={{ color: category.color }} />
                      {category.label}
                    </span>
                    <span className="text-muted">{points} pkt</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={cn("h-full rounded-full", points < 0 ? "bg-rose-400" : "")}
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: points < 0 ? undefined : category.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
