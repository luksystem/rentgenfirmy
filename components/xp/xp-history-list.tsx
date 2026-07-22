import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { XpLedgerEntry } from "@/lib/xp/types";

export function XpHistoryList({ history }: { history: XpLedgerEntry[] }) {
  if (!history.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted">
          Brak historii — punkty pojawią się tu automatycznie.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-2 pt-6">
        <p className="text-sm font-semibold text-foreground">Historia</p>
        <ul className="grid gap-1.5">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-muted/15 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-foreground/90">{entry.reason || "Punkty"}</p>
                <p className="text-xs text-muted">{formatDate(entry.createdAt)}</p>
              </div>
              <span
                className={
                  entry.points < 0
                    ? "shrink-0 font-semibold text-rose-400"
                    : "shrink-0 font-semibold text-emerald-400"
                }
              >
                {entry.points > 0 ? `+${entry.points}` : entry.points}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
