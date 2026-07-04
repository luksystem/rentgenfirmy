"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Contact,
  ClipboardList,
  ExternalLink,
  FileUp,
  FolderKanban,
  GitBranch,
  HardHat,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Key,
  Menu,
  PauseCircle,
  PhoneCall,
  Plus,
  Receipt,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isPublicAppRoute } from "@/lib/auth/routes";
import { useKanbanNewTasksRealtime, useKanbanOverdueTasksRealtime } from "@/hooks/use-kanban-realtime";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import { NavBadges } from "@/components/nav-badges";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationsRealtimeSubscriber } from "@/components/notifications-realtime-subscriber";
import { QuickAddMenuList } from "@/components/quick-add-menu";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  disabled?: boolean;
  activeExcludePrefixes?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroupsBase: NavGroup[] = [
  {
    label: "Główne",
    items: [{ href: "/", label: "Start", icon: Home }],
  },
  {
    label: "Sprzedaż",
    items: [
      { href: "/kontakty", label: "Kontakty", icon: Contact },
      {
        href: COMMERCIAL_MODULES.serviceSettlement.href,
        label: "Szybkie Oferty",
        icon: COMMERCIAL_MODULES.serviceSettlement.icon,
        activeExcludePrefixes: ["/oferty/zgloszenia"],
      },
      {
        href: COMMERCIAL_MODULES.salesCalculations.href,
        label: COMMERCIAL_MODULES.salesCalculations.label,
        icon: COMMERCIAL_MODULES.salesCalculations.icon,
      },
      { href: "/faktury", label: "Faktury", icon: Receipt },
    ],
  },
  {
    label: "Projekty",
    items: [
      { href: "/klienci", label: "Klienci", icon: Users },
      { href: "/procesy", label: "Procesy", icon: GitBranch },
      { href: "/projekty", label: "Projekty", icon: FolderKanban },
      { href: "/zlecenia", label: "Zlecenia", icon: ClipboardList },
      { href: "/dokumenty", label: "Dokumenty", icon: FileUp },
      { href: "/branze", label: "Katalog Branż", icon: HardHat },
    ],
  },
  {
    label: "Serwisy",
    items: [
      { href: "/przeglady", label: "Przeglądy", icon: ClipboardCheck },
      { href: "/oferty/zgloszenia", label: "Zgłoszenia", icon: Inbox },
      { href: "/oferty/ustawienia", label: "Stawki serwisu", icon: Settings },
      {
        href: "/zgloszenie",
        label: "Formularz klienta",
        icon: ExternalLink,
        external: true,
      },
    ],
  },
  {
    label: "Przestrzenie",
    items: [
      { href: "/przestrzenie", label: "Przestrzenie", icon: LayoutDashboard },
      { href: "/tablice-wdrozen", label: "Tablice wdrożeń", icon: LayoutGrid },
      { href: "/przerwania", label: "Przerwania", icon: PhoneCall },
    ],
  },
  {
    label: "Raporty",
    items: [{ href: "/raport", label: "Raport", icon: BarChart3 }],
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
    label: "Ustawienia",
    items: [
      { href: "/ustawienia", label: "Ustawienia", icon: Settings },
      { href: "/konto/haslo", label: "Zmiana hasła", icon: Key },
    ],
  },
];

const glowneNav = navGroupsBase.find((group) => group.label === "Główne")?.items ?? [];
const projektyNav =
  navGroupsBase.find((group) => group.label === "Projekty")?.items.find((item) => item.href === "/projekty") ??
  null;
const klienciNav =
  navGroupsBase.find((group) => group.label === "Projekty")?.items.find((item) => item.href === "/klienci") ??
  null;
const mobileBottomNav: NavItem[] = [
  glowneNav.find((item) => item.href === "/") ?? { href: "/", label: "Start", icon: Home },
  ...(projektyNav ? [projektyNav] : []),
];
const mobileNavLeft = mobileBottomNav.slice(0, 2);
const mobileNavRight = klienciNav ? [klienciNav] : [];
const mobilePrimaryHrefs = new Set([
  ...mobileNavLeft.map((item) => item.href),
  ...mobileNavRight.map((item) => item.href),
]);

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.disabled) {
    return false;
  }
  const { href, activeExcludePrefixes = [] } = item;
  if (
    activeExcludePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  return pathname === href || (href !== "/" && pathname.startsWith(href));
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
  external = false,
  disabled = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
  variant?: "sidebar" | "sheet";
  overdueBadgeCount?: number;
  newBadgeCount?: number;
  external?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        aria-disabled="true"
        title="Moduł w przygotowaniu — leady"
        className={cn(
          "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium opacity-45",
          variant === "sheet" && "rounded-2xl border border-border/50 bg-surface-muted/40 px-4 py-3",
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{label}</span>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted">
          Wkrótce
        </span>
      </div>
    );
  }

  if (variant === "sheet") {
    return (
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
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
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const displayName = useAuthStore((state) => state.displayName);
  const signOut = useAuthStore((state) => state.signOut);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const [serviceIntakeNewCount, setServiceIntakeNewCount] = useState(0);
  const [serviceIntakeOverdueCount, setServiceIntakeOverdueCount] = useState(0);
  const [contactsNewCount, setContactsNewCount] = useState(0);
  const [intakeOffersNewCount, setIntakeOffersNewCount] = useState(0);
  const [inspectionsPlanningCount, setInspectionsPlanningCount] = useState(0);
  const [inspectionsPlanningOverdueCount, setInspectionsPlanningOverdueCount] = useState(0);

  const refreshServiceIntakeCounts = useCallback(() => {
    void fetch("/api/service-intake/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          activeCount?: number;
          overdueCount?: number;
          newCount?: number;
        };
        setServiceIntakeNewCount(payload.newCount ?? 0);
        setServiceIntakeOverdueCount(payload.overdueCount ?? 0);
      })
      .catch(() => {
        setServiceIntakeNewCount(0);
        setServiceIntakeOverdueCount(0);
      });
  }, []);

  const refreshContactsCounts = useCallback(() => {
    void fetch("/api/contacts/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          unhandledCount?: number;
          newCount?: number;
        };
        setContactsNewCount(payload.newCount ?? payload.unhandledCount ?? 0);
      })
      .catch(() => {
        setContactsNewCount(0);
      });
  }, []);

  const refreshInspectionsCounts = useCallback(() => {
    void fetch("/api/inspections/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          planningDueCount?: number;
          planningOverdueCount?: number;
        };
        setInspectionsPlanningCount(payload.planningDueCount ?? 0);
        setInspectionsPlanningOverdueCount(payload.planningOverdueCount ?? 0);
      })
      .catch(() => {
        setInspectionsPlanningCount(0);
        setInspectionsPlanningOverdueCount(0);
      });
  }, []);

  const refreshIntakeOffersCounts = useCallback(() => {
    void fetch("/api/services/intake-offers/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          unreviewedCount?: number;
          newCount?: number;
        };
        setIntakeOffersNewCount(payload.newCount ?? payload.unreviewedCount ?? 0);
      })
      .catch(() => {
        setIntakeOffersNewCount(0);
      });
  }, []);

  const handleKanbanOverdueCountChange = useCallback((count: number) => {
    useProcessStore.setState({ kanbanOverdueTaskCount: count });
  }, []);

  const handleKanbanNewCountChange = useCallback((count: number) => {
    useProcessStore.setState({ kanbanNewTaskCount: count });
  }, []);

  useEffect(() => {
    void refreshKanbanOverdueTaskCount();
    void refreshKanbanNewTaskCount();
    refreshServiceIntakeCounts();
    refreshContactsCounts();
    refreshIntakeOffersCounts();
    refreshInspectionsCounts();
    const interval = window.setInterval(() => {
      refreshServiceIntakeCounts();
      refreshContactsCounts();
      refreshIntakeOffersCounts();
      refreshInspectionsCounts();
    }, 30000);
    const onFocus = () => {
      refreshServiceIntakeCounts();
      refreshContactsCounts();
      refreshIntakeOffersCounts();
      refreshInspectionsCounts();
    };
    const onContactsCountChanged = () => refreshContactsCounts();
    const onIntakeOffersCountChanged = () => refreshIntakeOffersCounts();
    const onInspectionsCountChanged = () => refreshInspectionsCounts();
    window.addEventListener("focus", onFocus);
    window.addEventListener("contacts-count-changed", onContactsCountChanged);
    window.addEventListener("services-intake-count-changed", onIntakeOffersCountChanged);
    window.addEventListener("inspections-count-changed", onInspectionsCountChanged);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("contacts-count-changed", onContactsCountChanged);
      window.removeEventListener("services-intake-count-changed", onIntakeOffersCountChanged);
      window.removeEventListener("inspections-count-changed", onInspectionsCountChanged);
    };
  }, [
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    refreshContactsCounts,
    refreshIntakeOffersCounts,
    refreshInspectionsCounts,
    refreshServiceIntakeCounts,
  ]);

  useKanbanOverdueTasksRealtime(handleKanbanOverdueCountChange);
  useKanbanNewTasksRealtime(handleKanbanNewCountChange);

  const kanbanBadges = useMemo(
    () => ({
      overdueBadgeCount: kanbanOverdueTaskCount,
      newBadgeCount: kanbanNewTaskCount,
    }),
    [kanbanNewTaskCount, kanbanOverdueTaskCount],
  );

  const serviceIntakeBadges = useMemo(
    () => ({
      overdueBadgeCount: serviceIntakeOverdueCount,
      newBadgeCount: serviceIntakeNewCount,
    }),
    [serviceIntakeNewCount, serviceIntakeOverdueCount],
  );

  function navBadgesForItem(href: string) {
    if (href === "/tablice-wdrozen") {
      return kanbanBadges;
    }
    if (href === "/oferty/zgloszenia") {
      return serviceIntakeBadges;
    }
    if (href === "/kontakty") {
      return { newBadgeCount: contactsNewCount };
    }
    if (href === COMMERCIAL_MODULES.serviceSettlement.href) {
      return { newBadgeCount: intakeOffersNewCount };
    }
    if (href === "/przeglady") {
      const planningApproachingCount = Math.max(
        0,
        inspectionsPlanningCount - inspectionsPlanningOverdueCount,
      );
      return {
        newBadgeCount: planningApproachingCount,
        overdueBadgeCount: inspectionsPlanningOverdueCount,
      };
    }
    return {};
  }

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

  const mobileSheetGroups = useMemo(
    () => navGroups.filter((group) => group.label !== "Główne"),
    [navGroups],
  );

  const secondaryNav = useMemo(
    () => mobileSheetGroups.flatMap((group) => group.items),
    [mobileSheetGroups],
  );

  const allNav = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);

  const currentPage = allNav.find((item) => isNavItemActive(pathname, item));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NotificationsRealtimeSubscriber />
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
                      active={isNavItemActive(pathname, item)}
                      disabled={item.disabled}
                      {...navBadgesForItem(item.href)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-5 pt-4">
          <div className="grid gap-2">
            <p className="px-3 text-xs text-sidebar-muted">{displayName || "Użytkownik"}</p>
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
        <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-border bg-background/80 px-8 py-3 backdrop-blur-xl xl:flex">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {currentPage?.label ?? "Rentgen firmy"}
            </p>
            <p className="truncate text-xs text-muted">Smart Home / BMS</p>
          </div>
          <NotificationBell />
        </header>

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

        <main className="mx-auto w-full min-w-0 max-w-[1500px] overflow-x-clip px-4 py-4 pb-28 sm:px-5 sm:py-6 sm:pb-28 xl:px-8 xl:pb-6">
          {children}
        </main>

        <>
        <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 xl:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 rounded-2xl border border-border bg-surface-elevated/95 px-1 py-1 shadow-card backdrop-blur-xl">
            {mobileNavLeft.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item);
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
              <button
                type="button"
                aria-label="Dodaj wpis"
                aria-expanded={addMenuOpen}
                onClick={() => {
                  setMenuOpen(false);
                  setAddMenuOpen(true);
                }}
                className="-mt-7 flex flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-card ring-4 ring-background">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-medium text-sidebar-muted">Dodaj</span>
              </button>
            </div>

            {mobileNavRight.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item);

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
                secondaryNav.some(
                  (item) => isNavItemActive(pathname, item) && !mobilePrimaryHrefs.has(item.href),
                )
                  ? "text-sidebar-accent"
                  : "text-sidebar-muted",
              )}
            >
              <span className="relative">
                <Menu className="h-5 w-5" />
                {kanbanOverdueTaskCount > 0 || kanbanNewTaskCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5">
                    <NavBadges
                      overdueCount={kanbanOverdueTaskCount}
                      newCount={kanbanNewTaskCount}
                      size="sm"
                    />
                  </span>
                ) : null}
              </span>
              Więcej
              {secondaryNav.some(
                (item) => isNavItemActive(pathname, item) && !mobilePrimaryHrefs.has(item.href),
              ) ? (
                <span className="h-1 w-1 rounded-full bg-sidebar-accent" aria-hidden />
              ) : (
                <span className="h-1 w-1" aria-hidden />
              )}
            </button>
          </div>
        </nav>

        {addMenuOpen ? (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Zamknij menu dodawania"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setAddMenuOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-card xl:inset-auto xl:bottom-6 xl:right-6 xl:w-[min(24rem,calc(100vw-2rem))] xl:rounded-2xl xl:border xl:pb-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Co chcesz dodać?</p>
                <button
                  type="button"
                  onClick={() => setAddMenuOpen(false)}
                  className="rounded-xl p-2 text-muted hover:bg-surface-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <QuickAddMenuList compact onNavigate={() => setAddMenuOpen(false)} />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Dodaj wpis"
          aria-expanded={addMenuOpen}
          onClick={() => {
            setMenuOpen(false);
            setAddMenuOpen(true);
          }}
          className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-card ring-4 ring-background xl:flex"
        >
          <Plus className="h-6 w-6" />
        </button>

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
              <div className="grid max-h-[min(70vh,520px)] gap-5 overflow-y-auto overscroll-contain">
                {mobileSheetGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {group.label}
                    </p>
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          {...item}
                          active={isNavItemActive(pathname, item)}
                      disabled={item.disabled}
                          onClick={() => setMenuOpen(false)}
                          variant="sheet"
                          {...navBadgesForItem(item.href)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        </>
      </div>
    </div>
  );
}
