"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NavBadges } from "@/components/nav-badges";
import { cn } from "@/lib/utils";

function SingleCountBadge({
  count,
  tone,
}: {
  count: number;
  tone: "amber" | "slate";
}) {
  if (count <= 0) {
    return null;
  }

  const toneClass =
    tone === "amber"
      ? "bg-amber-500 text-white"
      : "bg-slate-500/90 text-white";

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
        toneClass,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function DeploymentHubBoardTile({
  href,
  title,
  description,
  icon: Icon,
  newCount = 0,
  overdueCount = 0,
  pendingCount = 0,
  activeCount = 0,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  newCount?: number;
  overdueCount?: number;
  pendingCount?: number;
  activeCount?: number;
}) {
  const hasDualBadges = newCount > 0 || overdueCount > 0;
  const hasPendingBadge = pendingCount > 0;
  const hasActiveBadge = activeCount > 0 && !hasDualBadges && !hasPendingBadge;

  return (
    <Link href={href} className="group block min-w-0">
      <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
        <CardContent className="grid gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-muted/30 text-accent group-hover:border-accent/30">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-snug text-muted">{description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              {hasDualBadges ? (
                <NavBadges overdueCount={overdueCount} newCount={newCount} />
              ) : null}
              {hasPendingBadge ? <SingleCountBadge count={pendingCount} tone="amber" /> : null}
              {hasActiveBadge ? <SingleCountBadge count={activeCount} tone="slate" /> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
