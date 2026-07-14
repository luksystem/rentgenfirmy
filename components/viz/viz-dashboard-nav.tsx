"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type VizDashboardNavProps = {
  dashboardId: string;
  dashboardName: string;
};

const NAV_ITEMS = [
  { href: "", label: "Dashboard" },
  { href: "/konfiguracja", label: "Konfiguracja" },
  { href: "/projekty", label: "Projekty i zmienne" },
  { href: "/wykresy", label: "Wykresy" },
  { href: "/umowy", label: "Umowy serwisowe" },
  { href: "/dojazd", label: "Kalkulator dojazdu" },
] as const;

export function VizDashboardNav({ dashboardId, dashboardName }: VizDashboardNavProps) {
  const pathname = usePathname();
  const base = `/wizualizacje/${dashboardId}`;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/wizualizacje" className="hover:text-accent">
          Wizualizacje
        </Link>
        <span>/</span>
        <span className="text-foreground">{dashboardName}</span>
      </div>

      <nav className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-muted p-1">
        {NAV_ITEMS.map((item) => {
          const href = item.href ? `${base}${item.href}` : base;
          const isActive =
            item.href === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={item.href || "dashboard"}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-surface-elevated text-foreground shadow-soft"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
