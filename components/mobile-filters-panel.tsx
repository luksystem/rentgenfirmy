"use client";

import { useState, type ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileFiltersPanel({
  activeCount = 0,
  onClear,
  clearLabel = "Wyczyść",
  title = "Filtry",
  className,
  panelClassName,
  alwaysVisible = false,
  children,
}: {
  activeCount?: number;
  onClear?: () => void;
  clearLabel?: string;
  title?: string;
  className?: string;
  panelClassName?: string;
  /** Filtry zawsze widoczne także na mobile (np. zakładki statusu ustaleń). */
  alwaysVisible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasActive = activeCount > 0;

  return (
    <div className={className}>
      {!alwaysVisible ? (
        <div className="flex items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-filters-panel"
          >
            <Filter className="h-4 w-4" />
            {title}
            {hasActive ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {activeCount > 9 ? "9+" : activeCount}
              </span>
            ) : null}
          </Button>
          {hasActive && onClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <X className="mr-1 h-3.5 w-3.5" />
              {clearLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        id="mobile-filters-panel"
        className={cn(
          alwaysVisible
            ? "grid gap-3"
            : open
              ? "mt-3 grid gap-3 rounded-xl border border-border/80 bg-surface-muted/20 p-3 md:hidden"
              : "hidden",
          panelClassName,
        )}
      >
        {children}
      </div>

      {!alwaysVisible ? <div className="hidden md:block">{children}</div> : null}
    </div>
  );
}
