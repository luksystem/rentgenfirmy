"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Home,
  Menu,
  PauseCircle,
  PhoneCall,
  Plus,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Główne",
    items: [
      { href: "/", label: "Start", icon: Home },
      { href: "/projekty", label: "Projekty", icon: FolderKanban },
      { href: "/klienci", label: "Klienci", icon: Users },
      { href: "/przerwania", label: "Przerwania", icon: PhoneCall },
      { href: "/serwis", label: "Serwis", icon: Wrench },
    ],
  },
  {
    label: "Widoki",
    items: [
      { href: "/do-zamkniecia", label: "Do zamknięcia", icon: CheckCircle2 },
      { href: "/bez-kontaktu", label: "Bez kontaktu", icon: Clock3 },
      { href: "/oczekujace", label: "Oczekujące", icon: PauseCircle },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/raport", label: "Raport", icon: BarChart3 },
      { href: "/ustawienia", label: "Ustawienia", icon: Settings },
    ],
  },
];

const serwisNav = navGroups[0].items.find((item) => item.href === "/serwis");
const mobileNavLeft = navGroups[0].items.filter((item) => item.href !== "/serwis").slice(0, 2);
const mobileNavRight = navGroups[0].items.filter((item) => item.href !== "/serwis").slice(2);
const secondaryNav = [
  ...(serwisNav ? [serwisNav] : []),
  ...navGroups[1].items,
  ...navGroups[2].items,
];
const allNav = navGroups.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  variant = "sidebar",
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
  variant?: "sidebar" | "sheet";
}) {
  if (variant === "sheet") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
          active
            ? "bg-sidebar-accent-soft text-sidebar-accent"
            : "border border-border bg-surface-muted text-muted hover:bg-surface-elevated hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "border-l-[3px] border-sidebar-accent bg-sidebar-accent-soft pl-[calc(0.75rem-3px)] text-sidebar-accent"
          : "border-l-[3px] border-transparent text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4", active && "text-sidebar-accent")} />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPage = allNav.find((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar/95 p-5 backdrop-blur-xl xl:flex">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-soft">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sidebar-foreground">Rentgen firmy</p>
            <p className="text-xs text-sidebar-muted">Smart Home / BMS</p>
          </div>
        </Link>

        <nav className="grid flex-1 gap-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
                {group.label}
              </p>
              <div className="grid gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(pathname, item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <p className="mt-4 px-3 text-xs leading-5 text-sidebar-muted">
          Przepływ projektów bez CRM-owego szumu — status, blokada i następny krok.
        </p>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl xl:hidden">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-soft"
            >
              <Activity className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {currentPage?.label ?? "Rentgen firmy"}
              </p>
              <p className="truncate text-xs text-muted">Smart Home / BMS</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-4 pb-28 sm:px-5 sm:py-6 sm:pb-28 xl:px-8 xl:pb-6">
          {children}
        </main>

        <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 xl:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 rounded-2xl border border-border bg-surface-elevated/95 px-1 py-1 shadow-card backdrop-blur-xl">
            {mobileNavLeft.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                    active ? "text-sidebar-accent" : "text-sidebar-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {active ? (
                    <span className="h-1 w-1 rounded-full bg-sidebar-accent" aria-hidden />
                  ) : (
                    <span className="h-1 w-1" aria-hidden />
                  )}
                </Link>
              );
            })}

            <div className="flex justify-center">
              <Link
                href="/przerwania#dodaj-przerwanie"
                onClick={() => setMenuOpen(false)}
                aria-label="Dodaj przerwanie"
                className="-mt-7 flex flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-card ring-4 ring-background">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-medium text-sidebar-muted">Dodaj</span>
              </Link>
            </div>

            {mobileNavRight.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                    active ? "text-sidebar-accent" : "text-sidebar-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {active ? (
                    <span className="h-1 w-1 rounded-full bg-sidebar-accent" aria-hidden />
                  ) : (
                    <span className="h-1 w-1" aria-hidden />
                  )}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                secondaryNav.some((item) => isActive(pathname, item.href))
                  ? "text-sidebar-accent"
                  : "text-sidebar-muted",
              )}
            >
              <Menu className="h-5 w-5" />
              Więcej
              {secondaryNav.some((item) => isActive(pathname, item.href)) ? (
                <span className="h-1 w-1 rounded-full bg-sidebar-accent" aria-hidden />
              ) : (
                <span className="h-1 w-1" aria-hidden />
              )}
            </button>
          </div>
        </nav>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              type="button"
              aria-label="Zamknij menu"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-foreground">Więcej widoków</p>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl p-2 text-muted hover:bg-surface-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2">
                {secondaryNav.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(pathname, item.href)}
                    onClick={() => setMenuOpen(false)}
                    variant="sheet"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
