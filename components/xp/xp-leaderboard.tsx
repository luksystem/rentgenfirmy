import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { xpIcon } from "@/components/xp/xp-icon-map";
import { cn } from "@/lib/utils";
import type { XpLeaderboardRow } from "@/lib/xp/types";

export function XpLeaderboard({
  rows,
  highlightEmployeeId,
}: {
  rows: XpLeaderboardRow[];
  highlightEmployeeId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-300" />
          Ranking punktów XP
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Ranking pojawi się po pierwszych zdobytych punktach.</p>
        ) : (
          <ul className="grid gap-1.5">
            {rows.map((row) => {
              const LevelIcon = xpIcon(row.level.icon);
              return (
                <li
                  key={row.employeeId}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm",
                    row.employeeId === highlightEmployeeId
                      ? "border-accent/50 bg-accent/5"
                      : "bg-surface-muted/10",
                  )}
                >
                  <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted">
                    {row.rank}
                  </span>
                  <UserAvatar name={row.employeeName} avatarUrl={row.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-foreground/90">{row.employeeName}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <LevelIcon className="h-3.5 w-3.5 text-amber-400" />
                    {row.level.label}
                  </span>
                  <span className="w-16 shrink-0 text-right font-semibold text-foreground">
                    {row.totalPoints} XP
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
