"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  ClipboardList,
  FolderKanban,
  GitBranch,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  PauseCircle,
  PhoneCall,
  Plus,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isPublicAppRoute } from "@/lib/auth/routes";
import { useKanbanNewTasksRealtime, useKanbanOverdueTasksRealtime } from "@/hooks/use-kanban-realtime";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { COMMERCIAL_MODULE_LIST } from "@/lib/modules/commercial-modules";
import { NotificationBell } from "@/components/notification-bell";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";

const commercialNavItems = COMMERCIAL_MODULE_LIST.map((module) => ({
  href: module.href,
  label: module.label,
  icon: module.icon,
}));

const navGroupsBase = [
  {
    label: "Główne",
    items: [
      { href: "/", label: "Start", icon: Home },
      { href: "/projekty", label: "Projekty", icon: FolderKanban },
      { href: "/procesy", label: "Procesy", icon: GitBranch },
      { href: "/tablice-wdrozen", label: "Tablice wdrożeń", icon: LayoutGrid },
      { href: "/przestrzenie", label: "Przestrzenie", icon: LayoutDashboard },
      { href: "/klienci", label: "Klienci", icon: Users },
      { href: "/przerwania", label: "Przerwania", icon: PhoneCall },
      { href: "/zlecenia", label: "Zlecenia", icon: ClipboardList },
    ],
  },
  {
    label: "Oferty",
    items: commercialNavItems,
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
      { href: "/konto/haslo", label: "Zmiana hasła", icon: Settings },
    ],
  },
];

const ofertyNav = commercialNavItems.find((item) => item.href === "/oferty");
const kalkulacjeNav = commercialNavItems.find((item) => item.href === "/kalkulacje");
const procesyNav = navGroupsBase[0].items.find((item) => item.href === "/procesy");
const tabliceWdrozenNav = navGroupsBase[0].items.find((item) => item.href === "/tablice-wdrozen");
const przestrzenieNav = navGroupsBase[0].items.find((item) => item.href === "/przestrzenie");
const zleceniaNav = navGroupsBase[0].items.find((item) => item.href === "/zlecenia");
const klienciNav = navGroupsBase[0].items.find((item) => item.href === "/klienci");
const mobileMainNav = navGroupsBase[0].items.filter(
  (item) =>
    item.href !== "/zlecenia" &&
    item.href !== "/klienci" &&
    item.href !== "/procesy" &&
    item.href !== "/tablice-wdrozen" &&
    item.href !== "/przestrzenie",
);
const mobileNavLeft = mobileMainNav.slice(0, 2);
const mobileNavRight = mobileMainNav.slice(2);

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function NavBadges({
  overdueCount = 0,
  newCount = 0,
}: {
  overdueCount?: number;
  newCount?: number;
}) {
  if (overdueCount <= 0 && newCount <= 0) {
    return null;
  }

  return (
    <span className="flex items-center gap-1">
      {overdueCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {overdueCount > 99 ? "99+" : overdueCount}
        </span>
      ) : null}
      {newCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
          {newCount > 99 ? "99+" : newCount}
        </span>
      ) : null}
    </span>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  variant = "sidebar",
  overdueBadgeCount = 0,
  newBadgeCount = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
  variant?: "sidebar" | "sheet";
  overdueBadgeCount?: number;
  newBadgeCount?: number;
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
      <span className="flex-1">{label}</span>
      <NavBadges overdueCount={overdueBadgeCount} newCount={newBadgeCount} />
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
      <span className="flex-1">{label}</span>
      <NavBadges overdueCount={overdueBadgeCount} newCount={newBadgeCount} />
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicAppRoute(pathname)) {
    return <>{children}</>;
  }

  return <AppShellAuthenticated>{children}</AppShellAuthenticated>;
}

function AppShellAuthenticated({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const profileId = useAuthStore((state) => state.profile?.id);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const displayName = useAuthStore((state) => state.displayName);
  const signOut = useAuthStore((state) => state.signOut);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);

  const handleKanbanOverdueCountChange = useCallback((count: number) => {
    useProcessStore.setState({ kanbanOverdueTaskCount: count });
  }, []);

  const handleKanbanNewCountChange = useCallback((count: number) => {
    useProcessStore.setState({ kanbanNewTaskCount: count });
  }, []);

  const handleNotificationsRefresh = useCallback(() => {
    if (profileId) {
      void refreshUnreadCount(profileId);
      void loadNotifications(profileId);
    }
  }, [loadNotifications, profileId, refreshUnreadCount]);

  useEffect(() => {
    void refreshKanbanOverdueTaskCount();
    void refreshKanbanNewTaskCount();
  }, [refreshKanbanNewTaskCount, refreshKanbanOverdueTaskCount]);

  useEffect(() => {
    if (profileId) {
      void refreshUnreadCount(profileId);
    }
  }, [profileId, refreshUnreadCount]);

  useKanbanOverdueTasksRealtime(handleKanbanOverdueCountChange);
  useKanbanNewTasksRealtime(handleKanbanNewCountChange);
  useNotificationsRealtime(profileId, handleNotificationsRefresh);

  const kanbanBadges = useMemo(
    () => ({
      overdueBadgeCount: kanbanOverdueTaskCount,
      newBadgeCount: kanbanNewTaskCount,
    }),
    [kanbanNewTaskCount, kanbanOverdueTaskCount],
  );

  const navGroups = useMemo(() => {
    const groups = [...navGroupsBase];

    if (isAdministrator) {
      groups.push({
        label: "Administracja",
        items: [{ href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Shield }],
      });
    }

    return groups;
  }, [isAdministrator]);

  const secondaryNav = useMemo(
    () => [
      ...(ofertyNav ? [ofertyNav] : []),
      ...(kalkulacjeNav ? [kalkulacjeNav] : []),
      ...(procesyNav ? [procesyNav] : []),
      ...(tabliceWdrozenNav ? [tabliceWdrozenNav] : []),
      ...(przestrzenieNav ? [przestrzenieNav] : []),
      ...(zleceniaNav ? [zleceniaNav] : []),
      ...(klienciNav ? [klienciNav] : []),
      ...(isAdministrator
        ? [{ href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Shield }]
        : []),
      ...navGroupsBase[2].items,
      ...navGroupsBase[3].items,
    ],
    [isAdministrator],
  );

  const allNav = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);

  const currentPage = allNav.find((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden h-screen w-72 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl xl:flex">
        <div className="shrink-0 p-5 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-soft">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground">Rentgen firmy</p>
              <p className="text-xs text-sidebar-muted">Smart Home / BMS</p>
            </div>
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          <div className="grid gap-6">
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
                      {...(item.href === "/tablice-wdrozen" ? kanbanBadges : {})}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-5 pt-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2 px-3">
              <p className="text-xs text-sidebar-muted">{displayName || "Użytkownik"}</p>
              <NotificationBell />
            </div>
            <button
              type="button"
              onClick={() => void signOut().then(() => window.location.assign("/logowanie"))}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted transition hover:bg-white/5 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              Wyloguj
            </button>
          </div>
        </div>
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
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-4 pb-28 sm:px-5 sm:py-6 sm:pb-28 xl:px-8 xl:pb-6">
          {children}
        </main>

        <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 xl:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 rounded-2xl border border-border bg-surface-elevated/95 px-1 py-1 shadow-card backdrop-blur-xl">
            {mobileNavLeft.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              const badgeCount = 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                    active ? "text-sidebar-accent" : "text-sidebar-muted",
                  )}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {badgeCount > 0 ? (
                      <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </span>
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
                "relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                secondaryNav.some((item) => isActive(pathname, item.href))
                  ? "text-sidebar-accent"
                  : "text-sidebar-muted",
              )}
            >
              <span className="relative">
                <Menu className="h-5 w-5" />
                {kanbanOverdueTaskCount > 0 || kanbanNewTaskCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex gap-0.5">
                    {kanbanOverdueTaskCount > 0 ? (
                      <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white">
                        {kanbanOverdueTaskCount > 9 ? "9+" : kanbanOverdueTaskCount}
                      </span>
                    ) : null}
                    {kanbanNewTaskCount > 0 ? (
                      <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[8px] font-bold text-white">
                        {kanbanNewTaskCount > 9 ? "9+" : kanbanNewTaskCount}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
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
              <div className="grid max-h-[min(70vh,520px)] gap-2 overflow-y-auto overscroll-contain">
                {secondaryNav.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(pathname, item.href)}
                    onClick={() => setMenuOpen(false)}
                    variant="sheet"
                    {...(item.href === "/tablice-wdrozen" ? kanbanBadges : {})}
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
