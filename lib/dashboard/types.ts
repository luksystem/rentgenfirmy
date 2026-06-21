export const DASHBOARD_SPACE_KINDS = [
  "client",
  "team",
  "owner",
  "manager",
  "office",
  "installer",
  "employee",
] as const;

export type DashboardSpaceKind = (typeof DASHBOARD_SPACE_KINDS)[number];

export type DashboardSpace = {
  id: string;
  kind: DashboardSpaceKind;
  projectId: string | null;
  clientId: string | null;
  profileId: string | null;
  title: string;
  publicToken: string;
  publicEnabled: boolean;
  publicAccessConfigured: boolean;
  publicAccessUsernameRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export const DASHBOARD_SPACE_LABELS: Record<DashboardSpaceKind, string> = {
  client: "Dashboard klienta",
  team: "Dashboard zespołu",
  owner: "Dashboard właściciela",
  manager: "Dashboard managerów",
  office: "Dashboard obsługi biura",
  installer: "Dashboard instalatorów",
  employee: "Przestrzeń pracownika",
};

export const DASHBOARD_SPACE_DESCRIPTIONS: Record<DashboardSpaceKind, string> = {
  client:
    "Przestrzeń współpracy z klientem: dane kontaktowe, ustalenia, akceptacje, specyfikacja i dokumentacja projektu.",
  team: "Wewnętrzna przestrzeń zespołu firmy dla danego projektu — pliki, notatki, koordynacja.",
  owner: "Pulpit właściciela firmy — kluczowe wskaźniki i przegląd organizacji.",
  manager: "Pulpit managerów — projekty, terminy i eskalacje.",
  office: "Pulpit obsługi biura — dokumenty, korespondencja, rozliczenia.",
  installer: "Pulpit instalatorów — harmonogramy, zlecenia terenowe, protokoły.",
  employee: "Osobista przestrzeń pracownika — zadania, notatki i skróty.",
};

export const GLOBAL_DASHBOARD_KINDS = ["owner", "manager", "office", "installer"] as const;
export type GlobalDashboardKind = (typeof GLOBAL_DASHBOARD_KINDS)[number];

export const PROJECT_DASHBOARD_KINDS = ["client", "team"] as const;
export type ProjectDashboardKind = (typeof PROJECT_DASHBOARD_KINDS)[number];

export type ClientDashboardSectionId =
  | "project"
  | "process"
  | "agreements"
  | "specification"
  | "files"
  | "links"
  | "communication"
  | "handover"
  | "documentation";

export type TeamDashboardSectionId =
  | "subcontractors"
  | "coordination"
  | "files"
  | "notes";

export type TeamDashboardSection = {
  id: TeamDashboardSectionId;
  title: string;
  description: string;
  status: "active" | "planned";
};

export const TEAM_DASHBOARD_SECTIONS: TeamDashboardSection[] = [
  {
    id: "subcontractors",
    title: "Nasi podwykonawcy",
    description:
      "Firmy współpracujące z nami: zlecenia, oferty, zapytania ofertowe, rozliczenia i status współpracy.",
    status: "planned",
  },
  {
    id: "coordination",
    title: "Koordynacja branż",
    description: "Ustalenia z podwykonawcami, harmonogramy i eskalacje wewnętrzne.",
    status: "planned",
  },
  {
    id: "files",
    title: "Pliki zespołu",
    description: "Dokumentacja wewnętrzna projektu.",
    status: "planned",
  },
  {
    id: "notes",
    title: "Notatki wewnętrzne",
    description: "Notatki niewidoczne dla klienta.",
    status: "planned",
  },
];

export type ClientDashboardSection = {
  id: ClientDashboardSectionId;
  title: string;
  description: string;
  status: "active" | "planned";
};

export const CLIENT_DASHBOARD_SECTIONS: ClientDashboardSection[] = [
  {
    id: "project",
    title: "Dane projektu",
    description: "Status, etap, priorytet i podstawowe informacje o realizacji.",
    status: "active",
  },
  {
    id: "process",
    title: "Proces wdrożenia",
    description: "Etapy procesu, postęp i linki do elementów (tablice Kanban, checklisty).",
    status: "active",
  },
  {
    id: "files",
    title: "Pliki i zdjęcia",
    description: "Dokumentacja, zdjęcia z obiektu, plany i materiały projektowe.",
    status: "planned",
  },
  {
    id: "links",
    title: "Linki zewnętrzne",
    description: "Dyski chmurowe, narzędzia współpracy i inne zasoby.",
    status: "planned",
  },
  {
    id: "communication",
    title: "Komunikacja",
    description: "Szybki kontakt z zespołem i historia ustaleń.",
    status: "planned",
  },
  {
    id: "agreements",
    title: "Ustalenia i akceptacje",
    description: "Proces akceptacji ustaleń i zmian przez klienta (integracje, kolory, urządzenia, koszty).",
    status: "active",
  },
  {
    id: "specification",
    title: "Konfigurator specyfikacji",
    description: "Wyklikiwanie elementów projektu: oświetlenie, rolety, muzyka, czujki, klimatyzacja itd.",
    status: "active",
  },
  {
    id: "handover",
    title: "Przekazanie systemu",
    description: "Potwierdzenie spełnienia założeń i formalne przekazanie instalacji.",
    status: "planned",
  },
  {
    id: "documentation",
    title: "Dokumentacja końcowa",
    description: "Integracje, odpowiedzialności, procedury awaryjne — standard per system.",
    status: "planned",
  },
];

export function getDashboardPublicUrl(token: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/przestrzen/${token}`;
  }
  return `/przestrzen/${token}`;
}

export function getInternalDashboardHref(kind: DashboardSpaceKind, context?: {
  clientId?: string;
  projectId?: string;
  profileId?: string;
}) {
  switch (kind) {
    case "client":
      return context?.clientId ? `/przestrzenie/klient/${context.clientId}` : "/przestrzenie";
    case "team":
      return context?.projectId ? `/przestrzenie/zespol/${context.projectId}` : "/przestrzenie";
    case "owner":
      return "/przestrzenie/wlasciciel";
    case "manager":
      return "/przestrzenie/manager";
    case "office":
      return "/przestrzenie/biuro";
    case "installer":
      return "/przestrzenie/instalatorzy";
    case "employee":
      return context?.profileId
        ? `/przestrzenie/pracownik/${context.profileId}`
        : "/przestrzenie/pracownik";
    default:
      return "/przestrzenie";
  }
}
