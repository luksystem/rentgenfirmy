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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavLeft = [
  { href: "/", label: "Start", icon: Home },
  { href: "/projekty", label: "Projekty", icon: FolderKanban },
];

const mobileNavRight = [
  { href: "/przerwania", label: "Przerwania", icon: PhoneCall },
];

const primaryNav = [...mobileNavLeft, ...mobileNavRight];

const secondaryNav = [
  { href: "/do-zamkniecia", label: "Do zamknięcia", icon: CheckCircle2 },
  { href: "/bez-kontaktu", label: "Bez kontaktu", icon: Clock3 },
  { href: "/oczekujace", label: "Oczekujące", icon: PauseCircle },
  { href: "/raport", label: "Raport", icon: BarChart3 },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
];

const allNav = [...primaryNav, ...secondaryNav];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPage = allNav.find((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-200 bg-white/90 p-5 backdrop-blur xl:block">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Rentgen firmy</p>
            <p className="text-xs text-slate-500">Smart Home / BMS</p>
          </div>
        </Link>

        <nav className="grid gap-1">
          {allNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  active && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur xl:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Activity className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {currentPage?.label ?? "Rentgen firmy"}
              </p>
              <p className="truncate text-xs text-slate-500">Smart Home / BMS</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-4 pb-24 sm:px-5 sm:py-6 sm:pb-24 xl:px-8 xl:pb-6">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {mobileNavLeft.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium text-slate-500",
                    active && "text-slate-950",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-slate-950")} />
                  {item.label}
                </Link>
              );
            })}

            <div className="flex justify-center">
              <Link
                href="/przerwania#dodaj-przerwanie"
                onClick={() => setMenuOpen(false)}
                aria-label="Dodaj przerwanie"
                className="-mt-5 flex flex-col items-center gap-1"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg ring-4 ring-white">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-[11px] font-medium text-slate-500">Dodaj</span>
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
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium text-slate-500",
                    active && "text-slate-950",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-slate-950")} />
                  {item.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium text-slate-500",
                secondaryNav.some((item) => isActive(pathname, item.href)) && "text-slate-950",
              )}
            >
              <Menu className="h-5 w-5" />
              Więcej
            </button>
          </div>
        </nav>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              type="button"
              aria-label="Zamknij menu"
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold">Więcej widoków</p>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700",
                        active ? "bg-slate-950 text-white" : "bg-slate-50",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
