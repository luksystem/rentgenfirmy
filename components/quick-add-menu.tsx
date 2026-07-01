"use client";

import Link from "next/link";
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
    description: "Zdjęcie, skan lub PDF powiązany z klientem lub projektem",
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

export function QuickAddMenuList({
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
              <p className={compact ? "text-xs font-medium text-foreground" : "text-sm font-medium text-foreground"}>
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
