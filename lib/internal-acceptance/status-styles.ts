import type { InternalAcceptanceStatus } from "@/lib/internal-acceptance/types";

export const INTERNAL_ACCEPTANCE_STATUS_STYLES: Record<
  InternalAcceptanceStatus,
  {
    badge: string;
    row: string;
    rowActive: string;
    dot: string;
  }
> = {
  NOT_STARTED: {
    badge: "border-border/60 bg-surface-muted/40 text-muted",
    row: "border-border/60 bg-surface/30 hover:border-border",
    rowActive: "border-accent/40 bg-accent/5",
    dot: "bg-muted",
  },
  IN_PROGRESS: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    row: "border-amber-500/30 bg-amber-500/8 hover:border-amber-500/45",
    rowActive: "border-amber-400/50 bg-amber-500/12",
    dot: "bg-amber-400",
  },
  PASSED: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    row: "border-emerald-500/30 bg-emerald-500/8 hover:border-emerald-500/45",
    rowActive: "border-emerald-400/50 bg-emerald-500/12",
    dot: "bg-emerald-400",
  },
  FAILED: {
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    row: "border-rose-500/30 bg-rose-500/8 hover:border-rose-500/45",
    rowActive: "border-rose-400/50 bg-rose-500/12",
    dot: "bg-rose-400",
  },
  NOT_APPLICABLE: {
    badge: "border-slate-500/40 bg-slate-500/15 text-slate-300",
    row: "border-slate-500/25 bg-slate-500/5 hover:border-slate-500/40",
    rowActive: "border-slate-400/45 bg-slate-500/10",
    dot: "bg-slate-400",
  },
};
