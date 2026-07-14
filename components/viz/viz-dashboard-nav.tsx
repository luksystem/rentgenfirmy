"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { VizDashboardPermissions } from "@/lib/viz/types";

type VizDashboardNavProps = {
  dashboardId: string;
  dashboardName: string;
  permissions?: VizDashboardPermissions | null;
  canManage?: boolean;
};

const ALL_NAV_ITEMS = [
  { href: "", label: "Dashboard", permission: "viewDashboard" as const },
  { href: "/konfiguracja", label: "Konfiguracja", permission: "configure" as const, manageOnly: true },
  { href: "/projekty", label: "Projekty i zmienne", permission: "configure" as const, manageOnly: true },
  { href: "/wykresy", label: "Wykresy", permission: "viewDashboard" as const },
  { href: "/umowy", label: "Umowy serwisowe", permission: "viewContract" as const },
  { href: "/dojazd", label: "Kalkulator dojazdu", permission: "calculateTravel" as const },
] as const;

export function VizDashboardNav({
  dashboardId,
  dashboardName,
  permissions,
  canManage = true,
}: VizDashboardNavProps) {
  const pathname = usePathname();
  const base = `/wizualizacje/${dashboardId}`;

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if ("manageOnly" in item && item.manageOnly && !canManage) {
      return false;
    }
    if (!permissions) {
      return true;
    }
    return permissions[item.permission] === true;
  });

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
        {navItems.map((item) => {
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
