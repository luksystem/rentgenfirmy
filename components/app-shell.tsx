"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Home,
  PauseCircle,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/projekty", label: "Projekty", icon: FolderKanban },
  { href: "/do-zamkniecia", label: "Do zamknięcia", icon: CheckCircle2 },
  { href: "/bez-kontaktu", label: "Bez kontaktu", icon: Clock3 },
  { href: "/oczekujace", label: "Oczekujące", icon: PauseCircle },
  { href: "/przerwania", label: "Przerwania", icon: PhoneCall },
  { href: "/raport", label: "Raport", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

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
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/85 px-5 py-4 backdrop-blur xl:hidden">
          <div className="flex items-center gap-3 overflow-x-auto">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate-600",
                  pathname === item.href && "bg-slate-950 text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
