"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import {
  CalendarOff,
  Clock3,
  FileUp,
  Navigation,
  Package,
  PhoneCall,
} from "lucide-react";

export type QuickAddMenuItem = {
  href?: string;
  action?: "navigate-to";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

function buildDocumentQuickAddHref(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  const clientMatch = pathname.match(/^\/przestrzenie\/klient\/([^/]+)/);
  if (clientMatch?.[1]) {
    params.set("clientId", clientMatch[1]);
    const projectId = searchParams.get("project");
    if (projectId) {
      params.set("projectId", projectId);
    }
    const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/dokumenty/nowy?${query}` : "/dokumenty/nowy";
}

export function useQuickAddMenuItems(): QuickAddMenuItem[] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => [
      {
        href: "/moja-praca/czas-pracy",
        label: "Czas pracy",
        description: "Dodaj wpis czasu pracy",
        icon: Clock3,
      },
      {
        href: "/zapotrzebowania/nowy",
        label: "Zgłoś zapotrzebowanie",
        description: "Ubrania, narzędzia lub sprzęt — workflow akceptacji",
        icon: Package,
      },
      {
        href: buildDocumentQuickAddHref(pathname, searchParams),
        label: "Dodaj dokument",
        description: "Zdjęcie, skan lub PDF powiązany z projektem klienta",
        icon: FileUp,
      },
      {
        href: "/przerwania#dodaj-przerwanie",
        label: "Przerwanie",
        description: "Szybki wpis przerwania operacyjnego",
        icon: PhoneCall,
      },
      {
        href: "/moja-praca/dostepnosc",
        label: "Zgłoś urlop",
        description: "Wniosek urlopowy / dostępność",
        icon: CalendarOff,
      },
      {
        action: "navigate-to",
        label: "Prowadź do",
        description: "Wybierz klienta i otwórz trasę w Google Maps",
        icon: Navigation,
      },
    ],
    [pathname, searchParams],
  );
}

/** Statyczna lista (bez kontekstu trasy) — np. testy / fallback. */
export const QUICK_ADD_MENU_ITEMS: QuickAddMenuItem[] = [
  {
    href: "/moja-praca/czas-pracy",
    label: "Czas pracy",
    description: "Dodaj wpis czasu pracy",
    icon: Clock3,
  },
  {
    href: "/zapotrzebowania/nowy",
    label: "Zgłoś zapotrzebowanie",
    description: "Ubrania, narzędzia lub sprzęt — workflow akceptacji",
    icon: Package,
  },
  {
    href: "/dokumenty/nowy",
    label: "Dodaj dokument",
    description: "Zdjęcie, skan lub PDF powiązany z projektem klienta",
    icon: FileUp,
  },
  {
    href: "/przerwania#dodaj-przerwanie",
    label: "Przerwanie",
    description: "Szybki wpis przerwania operacyjnego",
    icon: PhoneCall,
  },
  {
    href: "/moja-praca/dostepnosc",
    label: "Zgłoś urlop",
    description: "Wniosek urlopowy / dostępność",
    icon: CalendarOff,
  },
  {
    action: "navigate-to",
    label: "Prowadź do",
    description: "Wybierz klienta i otwórz trasę w Google Maps",
    icon: Navigation,
  },
];

function MenuItemCard({
  item,
  compact,
  onNavigate,
  onAction,
}: {
  item: QuickAddMenuItem;
  compact?: boolean;
  onNavigate?: () => void;
  onAction?: (action: "navigate-to") => void;
}) {
  const Icon = item.icon;
  const className =
    "flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/20 px-3 py-2.5 transition hover:border-accent/30 hover:bg-surface-muted/40";

  const content = (
    <>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface text-accent">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <p
          className={
            compact ? "text-xs font-medium text-foreground" : "text-sm font-medium text-foreground"
          }
        >
          {item.label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted">{item.description}</p>
      </span>
    </>
  );

  if (item.action) {
    return (
      <button
        type="button"
        className={`${className} w-full text-left`}
        onClick={() => {
          onAction?.(item.action!);
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href ?? "/"}
      onClick={onNavigate}
      className={className}
    >
      {content}
    </Link>
  );
}

function QuickAddMenuListInner({
  onNavigate,
  onNavigateToClient,
  compact = false,
}: {
  onNavigate?: () => void;
  onNavigateToClient?: () => void;
  compact?: boolean;
}) {
  const items = useQuickAddMenuItems();

  return (
    <div className="grid gap-1.5">
      {items.map((item) => (
        <MenuItemCard
          key={item.label}
          item={item}
          compact={compact}
          onNavigate={onNavigate}
          onAction={(action) => {
            if (action === "navigate-to") {
              onNavigateToClient?.();
            }
          }}
        />
      ))}
    </div>
  );
}

export function QuickAddMenuList({
  onNavigate,
  onNavigateToClient,
  compact = false,
}: {
  onNavigate?: () => void;
  onNavigateToClient?: () => void;
  compact?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <QuickAddMenuListFallback onNavigate={onNavigate} compact={compact} />
      }
    >
      <QuickAddMenuListInner
        onNavigate={onNavigate}
        onNavigateToClient={onNavigateToClient}
        compact={compact}
      />
    </Suspense>
  );
}

function QuickAddMenuListFallback({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      {QUICK_ADD_MENU_ITEMS.filter((item) => item.href).map((item) => (
        <MenuItemCard key={item.label} item={item} compact={compact} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
