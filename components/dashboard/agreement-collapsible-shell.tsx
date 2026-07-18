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
  headerBadges,
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
  /** Dodatkowe etykiety obok statusu (np. osoba odpowiedzialna). */
  headerBadges?: React.ReactNode;
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
        "min-w-0 max-w-full overflow-x-hidden rounded-xl border border-border/70 bg-surface-muted/15",
        compact ? "px-3 py-2.5" : "p-3 sm:p-4",
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
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <p className="min-w-0 w-full break-words font-medium text-foreground sm:w-auto sm:flex-1 sm:basis-0">
              {title}
            </p>
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:max-w-[min(100%,18rem)] sm:justify-end sm:shrink-0">
              {headerBadges}
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  AGREEMENT_STATUS_BADGE_CLASS[statusTone],
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          {subtitle ? (
            <p className="mt-0.5 break-words text-xs text-muted">{subtitle}</p>
          ) : null}
          {hint ? (
            <p className="mt-0.5 text-xs font-medium text-accent/90">{hint}</p>
          ) : null}
        </div>
      </button>

      {banner ? (
        <div className={cn("min-w-0", hasDetails ? "mt-2 pl-6" : "mt-2")}>{banner}</div>
      ) : null}

      {preview && !expanded ? (
        <div className={cn("min-w-0", hasDetails ? "mt-2 pl-6" : "mt-2")}>{preview}</div>
      ) : null}

      {hasDetails && expanded ? (
        <div
          className={cn(
            "grid min-w-0 max-w-full gap-3 overflow-x-hidden border-t border-border/60 pt-3",
            compact ? "mt-2" : "mt-3",
            // Na wąskim ekranie bez dodatkowego wcięcia — więcej miejsca na treść i przyciski
            hasDetails && "sm:pl-6",
          )}
        >
          {children}
        </div>
      ) : null}
    </article>
  );
}

export function CollapsibleSection({
  title,
  badge,
  meta,
  summary,
  defaultExpanded = false,
  children,
  className,
}: {
  title: string;
  /** Znacznik statusu widoczny zawsze, przy tytule (np. „Szkic” / „Opublikowana”). */
  badge?: React.ReactNode;
  /** Zawsze widoczna linia meta (np. data dodania, autor) — niezależnie od stanu zwinięcia. */
  meta?: React.ReactNode;
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-medium text-foreground">{title}</p>
            {badge}
          </div>
          {meta ? <p className="mt-0.5 break-words text-xs text-muted">{meta}</p> : null}
          {!expanded && summary ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted/70">{summary}</p>
          ) : null}
        </div>
      </button>
      {expanded ? <div className="border-t border-border/60 px-4 pb-4 pt-3">{children}</div> : null}
    </div>
  );
}
