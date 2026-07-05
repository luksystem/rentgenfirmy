"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  AGREEMENT_STATUS_BADGE_CLASS,
  type AgreementStatusBadgeTone,
} from "@/lib/dashboard/agreement-types";
import { cn } from "@/lib/utils";

export function AgreementCollapsibleShell({
  title,
  subtitle,
  statusLabel,
  statusTone,
  hint,
  banner,
  preview,
  defaultExpanded = false,
  compact = false,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusTone: AgreementStatusBadgeTone;
  hint?: string | null;
  /** Zawsze widoczne, niezależnie od stanu zwinięcia (np. ostrzeżenie o blokadzie etapu). */
  banner?: React.ReactNode;
  /** Zawsze widoczne pod nagłówkiem (np. skrót notatek akceptacji). */
  preview?: React.ReactNode;
  defaultExpanded?: boolean;
  compact?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasDetails = Boolean(children);

  return (
    <article
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-xl border border-border/70 bg-surface-muted/15",
        compact ? "px-3 py-2.5" : "p-4",
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full min-w-0 items-start gap-2 text-left",
          hasDetails ? "cursor-pointer" : "cursor-default",
        )}
        onClick={() => hasDetails && setExpanded((current) => !current)}
        aria-expanded={hasDetails ? expanded : undefined}
      >
        {hasDetails ? (
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform",
              expanded && "rotate-180",
            )}
          />
        ) : (
          <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="break-words font-medium text-foreground">{title}</p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                AGREEMENT_STATUS_BADGE_CLASS[statusTone],
              )}
            >
              {statusLabel}
            </span>
          </div>
          {subtitle ? (
            <p className="mt-0.5 break-words text-xs text-muted">{subtitle}</p>
          ) : null}
          {hint ? (
            <p className="mt-0.5 text-xs font-medium text-accent/90">{hint}</p>
          ) : null}
        </div>
      </button>

      {banner ? <div className={cn(hasDetails ? "mt-2 pl-6" : "mt-2")}>{banner}</div> : null}

      {preview && !expanded ? (
        <div className={cn(hasDetails ? "mt-2 pl-6" : "mt-2")}>{preview}</div>
      ) : null}

      {hasDetails && expanded ? (
        <div className={cn("grid gap-3 border-t border-border/60 pt-3", compact ? "mt-2" : "mt-3")}>
          {children}
        </div>
      ) : null}
    </article>
  );
}

export function CollapsibleSection({
  title,
  summary,
  defaultExpanded = false,
  children,
  className,
}: {
  title: string;
  summary?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("rounded-xl border border-border/70 bg-surface-muted/10", className)}>
      <button
        type="button"
        className="flex w-full items-start gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform",
            expanded && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {!expanded && summary ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{summary}</p>
          ) : null}
        </div>
      </button>
      {expanded ? <div className="border-t border-border/60 px-4 pb-4 pt-3">{children}</div> : null}
    </div>
  );
}
