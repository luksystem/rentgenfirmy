"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type VizScrollTabItem = {
  id: string;
  label: string;
  href: string;
};

type VizScrollTabBarProps = {
  tabs: VizScrollTabItem[];
  activeId: string;
  className?: string;
};

export function VizScrollTabBar({ tabs, activeId, className }: VizScrollTabBarProps) {
  return (
    <div
      className={cn(
        "-mx-1 overflow-x-auto pb-1 [scrollbar-width:thin]",
        className,
      )}
    >
      <div className="flex min-w-max gap-2 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
                isActive
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface-muted text-muted hover:border-accent/40 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
