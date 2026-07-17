"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import {
  Calculator,
  ClipboardList,
  FileText,
  FileUp,
  Inbox,
  Package,
  PhoneCall,
  Receipt,
  Target,
} from "lucide-react";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

export type QuickAddMenuItem = {
  href: string;
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
        href: "/przerwania#dodaj-przerwanie",
        label: "Przerwanie",
        description: "Szybki wpis przerwania operacyjnego",
        icon: PhoneCall,
      },
      {
        href: "/przerwania?kind=focus#dodaj-przerwanie",
        label: "Skupienie",
        description: "Blok czasu na skupioną pracę",
        icon: Target,
      },
      {
        href: "/oferty/zgloszenia",
        label: "Zgłoszenie serwisowe",
        description: "Panel zgłoszeń z formularza publicznego",
        icon: Inbox,
      },
      {
        href: `${COMMERCIAL_MODULES.serviceSettlement.href}/nowy`,
        label: "Rozliczenie serwisu",
        description: "Nowe rozliczenie / oferta serwisowa",
        icon: FileText,
      },
      {
        href: COMMERCIAL_MODULES.salesCalculations.href,
        label: "Kalkulacja sprzedażowa",
        description: "Nowa kalkulacja Smart Home",
        icon: Calculator,
      },
      {
        href: "/faktury/nowy",
        label: "Faktura / koszt",
        description: "Nowy wpis w rejestrze faktur i kosztów projektowych",
        icon: Receipt,
      },
      {
        href: buildDocumentQuickAddHref(pathname, searchParams),
        label: "Dokument",
        description: "Zdjęcie, skan lub PDF powiązany z projektem klienta",
        icon: FileUp,
      },
      {
        href: "/zapotrzebowania/nowy",
        label: "Zgłoś zapotrzebowanie",
        description: "Ubrania, narzędzia lub sprzęt — workflow akceptacji",
        icon: Package,
      },
      {
        href: "/zlecenia",
        label: "Zlecenie",
        description: "Nowe zlecenie serwisowe lub montażowe",
        icon: ClipboardList,
      },
    ],
    [pathname, searchParams],
  );
}

/** Statyczna lista (bez kontekstu trasy) — np. testy / fallback. */
export const QUICK_ADD_MENU_ITEMS: QuickAddMenuItem[] = [
  {
    href: "/przerwania#dodaj-przerwanie",
    label: "Przerwanie",
    description: "Szybki wpis przerwania operacyjnego",
    icon: PhoneCall,
  },
  {
    href: "/przerwania?kind=focus#dodaj-przerwanie",
    label: "Skupienie",
    description: "Blok czasu na skupioną pracę",
    icon: Target,
  },
  {
    href: "/oferty/zgloszenia",
    label: "Zgłoszenie serwisowe",
    description: "Panel zgłoszeń z formularza publicznego",
    icon: Inbox,
  },
  {
    href: `${COMMERCIAL_MODULES.serviceSettlement.href}/nowy`,
    label: "Rozliczenie serwisu",
    description: "Nowe rozliczenie / oferta serwisowa",
    icon: FileText,
  },
  {
    href: COMMERCIAL_MODULES.salesCalculations.href,
    label: "Kalkulacja sprzedażowa",
    description: "Nowa kalkulacja Smart Home",
    icon: Calculator,
  },
  {
    href: "/faktury/nowy",
    label: "Faktura / koszt",
    description: "Nowy wpis w rejestrze faktur i kosztów projektowych",
    icon: Receipt,
  },
  {
    href: "/dokumenty/nowy",
    label: "Dokument",
    description: "Zdjęcie, skan lub PDF powiązany z projektem klienta",
    icon: FileUp,
  },
  {
    href: "/zapotrzebowania/nowy",
    label: "Zgłoś zapotrzebowanie",
    description: "Ubrania, narzędzia lub sprzęt — workflow akceptacji",
    icon: Package,
  },
  {
    href: "/zlecenia",
    label: "Zlecenie",
    description: "Nowe zlecenie serwisowe lub montażowe",
    icon: ClipboardList,
  },
];

function QuickAddMenuListInner({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const items = useQuickAddMenuItems();

  return (
    <div className="grid gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            onClick={onNavigate}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/20 px-3 py-2.5 transition hover:border-accent/30 hover:bg-surface-muted/40"
          >
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
          </Link>
        );
      })}
    </div>
  );
}

export function QuickAddMenuList({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <Suspense fallback={<QuickAddMenuListFallback onNavigate={onNavigate} compact={compact} />}>
      <QuickAddMenuListInner onNavigate={onNavigate} compact={compact} />
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
      {QUICK_ADD_MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/20 px-3 py-2.5 transition hover:border-accent/30 hover:bg-surface-muted/40"
          >
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
          </Link>
        );
      })}
    </div>
  );
}
