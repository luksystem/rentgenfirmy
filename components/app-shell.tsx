"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
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
  ListTodo,
  LogOut,
  Key,
  Menu,
  PalmtreeIcon,
  PauseCircle,
  PhoneCall,
  Plus,
  Receipt,
  Settings,
  Shield,
  Star,
  Target,
  Timer,
  Users,
  Users2,
  CalendarRange,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isPublicAppRoute } from "@/lib/auth/routes";
import { useKanbanNewTasksRealtime, useKanbanOverdueTasksRealtime } from "@/hooks/use-kanban-realtime";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import { NAV_MODULE_GROUPS, type NavModuleKey } from "@/lib/navigation/nav-modules";
import { canAccessNavModule } from "@/lib/navigation/role-nav-permissions";
import { NavBadges } from "@/components/nav-badges";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationsRealtimeSubscriber } from "@/components/notifications-realtime-subscriber";
import { QuickAddMenuList } from "@/components/quick-add-menu";
import { useAuthStore } from "@/store/auth-store";
import { useLeaveStore } from "@/store/leave-store";
import { useNavFavoritesStore } from "@/store/nav-favorites-store";
import { useProcessStore } from "@/store/process-store";
import { useRoleNavPermissionsStore } from "@/store/role-nav-permissions-store";

type NavItem = {
  key?: NavModuleKey;
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

const NAV_MODULE_ICONS: Record<NavModuleKey, React.ComponentType<{ className?: string }>> = {
  start: Home,
  "my-work-tasks": ListTodo,
  "my-work-dashboard": LayoutDashboard,
  "my-work-time": Timer,
  "my-work-availability": PalmtreeIcon,
  contacts: Contact,
  "service-offers": COMMERCIAL_MODULES.serviceSettlement.icon,
  "sales-calculations": COMMERCIAL_MODULES.salesCalculations.icon,
  invoices: Receipt,
  clients: Users,
  processes: GitBranch,
  "resource-plan": CalendarRange,
  projects: FolderKanban,
  audit: Activity,
  "work-orders": ClipboardList,
  documents: FileUp,
  "trades-catalog": HardHat,
  inspections: ClipboardCheck,
  "service-requests": Inbox,
  "knowledge-base": BookOpen,
  "service-rates": Settings,
  "client-form": ExternalLink,
  spaces: LayoutDashboard,
  "implementation-boards": LayoutGrid,
  "goal-boards": Target,
  interruptions: PhoneCall,
  employees: Users2,
  reports: BarChart3,
  "view-to-close": CheckCircle2,
  "view-no-contact": Clock3,
  "view-waiting": PauseCircle,
  settings: Settings,
  "change-password": Key,
};

const navGroupsBase: NavGroup[] = NAV_MODULE_GROUPS.map((group) => ({
  label: group.label,
  items: group.modules.map((module) => ({
    key: module.key,
    href: module.href,
    label: module.label,
    icon: NAV_MODULE_ICONS[module.key],
    external: module.external,
    activeExcludePrefixes: module.activeExcludePrefixes,
  })),
}));

function buildMobileNavSlots(allNav: NavItem[]) {
  const byHref = new Map(allNav.map((item) => [item.href, item]));
  const left = [byHref.get("/"), byHref.get("/projekty")].filter(
    (item): item is NavItem => item != null,
  );
  const clients = byHref.get("/klienci");
  const right = clients ? [clients] : [];
  const primaryHrefs = new Set([...left.map((item) => item.href), ...right.map((item) => item.href)]);
  return { left, right, primaryHrefs };
}

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

function FavoriteToggle({
  label,
  favorite,
  onToggle,
}: {
  label: string;
  favorite: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={favorite ? `Usuń „${label}” z ulubionych` : `Dodaj „${label}” do ulubionych`}
      aria-pressed={favorite}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "shrink-0 rounded-lg p-1.5 transition hover:scale-105",
        favorite
          ? "text-amber-400 opacity-100"
          : "text-current opacity-0 focus-visible:opacity-100 group-hover:opacity-50 group-focus-within:opacity-50 hover:!opacity-100 hover:!text-amber-300",
      )}
    >
      <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
    </button>
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
  external = false,
  disabled = false,
  favorite,
  onToggleFavorite,
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
  favorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  if (disabled) {
    return (
      <div
        aria-disabled="true"
        title="Moduł w przygotowaniu"
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

  const favoriteToggle = onToggleFavorite ? (
    <FavoriteToggle label={label} favorite={Boolean(favorite)} onToggle={onToggleFavorite} />
  ) : null;

  if (variant === "sheet") {
    return (
      <div
        className={cn(
          "group flex items-center gap-1 rounded-2xl transition",
          active
            ? "bg-sidebar-accent-soft text-sidebar-accent"
            : "border border-border bg-surface-muted text-muted hover:bg-surface-elevated hover:text-foreground",
        )}
      >
        <Link
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          onClick={onClick}
          className="flex flex-1 items-center gap-3 py-3 pl-4 text-sm font-medium"
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{label}</span>
          <NavBadges overdueCount={overdueBadgeCount} newCount={newBadgeCount} />
        </Link>
        {favoriteToggle ? <div className="pr-3">{favoriteToggle}</div> : <div className="w-1" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-xl transition",
        active
          ? "border-l-[3px] border-sidebar-accent bg-sidebar-accent-soft"
          : "border-l-[3px] border-transparent hover:bg-white/5",
      )}
    >
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        onClick={onClick}
        className={cn(
          "flex flex-1 items-center gap-3 py-2.5 pl-[calc(0.75rem-3px)] text-sm font-medium",
          active ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4", active && "text-sidebar-accent")} />
        <span className="flex-1">{label}</span>
        <NavBadges overdueCount={overdueBadgeCount} newCount={newBadgeCount} />
      </Link>
      {favoriteToggle ? <div className="pr-2">{favoriteToggle}</div> : <div className="w-1" />}
    </div>
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
  const profileRole = useAuthStore((state) => state.profile?.role);
  const displayName = useAuthStore((state) => state.displayName);
  const signOut = useAuthStore((state) => state.signOut);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const leavePendingForMeCount = useLeaveStore((state) => state.pendingForMeCount);
  const refreshLeavePendingForMeCount = useLeaveStore((state) => state.refreshPendingForMeCount);
  const profileId = useAuthStore((state) => state.profile?.id);
  const navFavoriteHrefs = useNavFavoritesStore((state) => state.hrefs);
  const ensureNavFavorites = useNavFavoritesStore((state) => state.ensure);
  const toggleNavFavorite = useNavFavoritesStore((state) => state.toggle);
  const navPermissionsConfig = useRoleNavPermissionsStore((state) => state.config);
  const hydrateNavPermissions = useRoleNavPermissionsStore((state) => state.hydrate);
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
    void refreshLeavePendingForMeCount();
    refreshServiceIntakeCounts();
    refreshContactsCounts();
    refreshIntakeOffersCounts();
    refreshInspectionsCounts();
    const interval = window.setInterval(() => {
      void refreshLeavePendingForMeCount();
      refreshServiceIntakeCounts();
      refreshContactsCounts();
      refreshIntakeOffersCounts();
      refreshInspectionsCounts();
    }, 30000);
    const onFocus = () => {
      void refreshLeavePendingForMeCount();
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
    refreshLeavePendingForMeCount,
    refreshContactsCounts,
    refreshIntakeOffersCounts,
    refreshInspectionsCounts,
    refreshServiceIntakeCounts,
  ]);

  useKanbanOverdueTasksRealtime(handleKanbanOverdueCountChange);
  useKanbanNewTasksRealtime(handleKanbanNewCountChange);

  useEffect(() => {
    if (profileId) {
      void ensureNavFavorites();
      void hydrateNavPermissions();
    }
  }, [profileId, ensureNavFavorites, hydrateNavPermissions]);

  const handleToggleFavorite = useCallback(
    (href: string) => {
      void toggleNavFavorite(href).catch((error) => {
        console.error("Nie udało się zapisać ulubionego elementu menu:", error);
      });
    },
    [toggleNavFavorite],
  );

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
    if (href === "/pracownicy") {
      return { overdueBadgeCount: leavePendingForMeCount };
    }
    return {};
  }

  const baseNavGroups = useMemo(() => {
    const groups = navGroupsBase
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!profileRole || !item.key) {
            return true;
          }
          return canAccessNavModule(profileRole, item.key, navPermissionsConfig);
        }),
      }))
      .filter((group) => group.items.length > 0);

    if (isAdministrator) {
      groups.push({
        label: "Administracja",
        items: [{ href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Shield }],
      });
    }

    return groups;
  }, [isAdministrator, profileRole, navPermissionsConfig]);

  const allNav = useMemo(() => baseNavGroups.flatMap((group) => group.items), [baseNavGroups]);

  const { left: mobileNavLeft, right: mobileNavRight, primaryHrefs: mobilePrimaryHrefs } = useMemo(
    () => buildMobileNavSlots(allNav),
    [allNav],
  );

  const favoriteHrefSet = useMemo(() => new Set(navFavoriteHrefs), [navFavoriteHrefs]);

  const favoriteNavItems = useMemo(() => {
    if (navFavoriteHrefs.length === 0) {
      return [];
    }
    const byHref = new Map(allNav.map((item) => [item.href, item]));
    return navFavoriteHrefs
      .map((href) => byHref.get(href))
      .filter((item): item is NavItem => item != null && !item.disabled);
  }, [navFavoriteHrefs, allNav]);

  const navGroups = useMemo(() => {
    if (favoriteNavItems.length === 0) {
      return baseNavGroups;
    }
    return [{ label: "Ulubione", items: favoriteNavItems }, ...baseNavGroups];
  }, [baseNavGroups, favoriteNavItems]);

  const mobileSheetGroups = useMemo(
    () => navGroups.filter((group) => group.label !== "Główne"),
    [navGroups],
  );

  const secondaryNav = useMemo(
    () => mobileSheetGroups.flatMap((group) => group.items),
    [mobileSheetGroups],
  );

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
                      key={`${group.label}-${item.href}`}
                      {...item}
                      active={isNavItemActive(pathname, item)}
                      disabled={item.disabled}
                      favorite={favoriteHrefSet.has(item.href)}
                      onToggleFavorite={() => handleToggleFavorite(item.href)}
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
            {mobileNavLeft.length < 2 ? <div aria-hidden /> : null}

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

            {mobileNavRight.length > 0 ? (
              mobileNavRight.map((item) => {
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
              })
            ) : (
              <div aria-hidden />
            )}

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
                          key={`${group.label}-${item.href}`}
                          {...item}
                          active={isNavItemActive(pathname, item)}
                          disabled={item.disabled}
                          onClick={() => setMenuOpen(false)}
                          variant="sheet"
                          favorite={favoriteHrefSet.has(item.href)}
                          onToggleFavorite={() => handleToggleFavorite(item.href)}
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
