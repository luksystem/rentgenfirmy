export const USER_ROLES = [
  "administrator",
  "manager",
  "instalator",
  "office",
  "podwykonawca",
  "klient",
  "gosc",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Role wewnętrzne — przypisywanie do projektów, zadań i list zespołu. */
export const STAFF_ROLES = [
  "administrator",
  "manager",
  "instalator",
  "office",
  "podwykonawca",
] as const satisfies readonly UserRole[];

export type StaffRole = (typeof STAFF_ROLES)[number];

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  /** Etap 2 (Plan Zasobów) — limit godzin dziennych/tygodniowych do walidacji obciążenia. */
  dailyHoursLimit: number | null;
  weeklyHoursLimit: number | null;
  baseLocation: string;
  costRate: number | null;
  isAvailableForPlanning: boolean;
  /** Przełożony — odbiorca wniosków urlopowych. Wymagany dla wszystkich ról poza administratorem. */
  supervisorId: string | null;
  /** Czy pracownik uczestniczy w comiesięcznym cyklu samooceny / oceny przełożonego. */
  monthlyReviewEnabled: boolean;
  /** Gdy true: może wysyłać wyceny/rozliczenia do klienta bez akceptacji administratora. */
  offerApprovalBypass: boolean;
  /** Gdy true (domyślnie): dostęp do wszystkich projektów. Administrator zawsze ma pełny dostęp. */
  allProjectsAccess: boolean;
  /** Publiczny URL awatara (opcjonalnie). */
  avatarUrl: string | null;
  /** Powiązany rekord klienta (tylko rola klient) — ustawiane z zakładki "Ścieżka szkoleniowa" w module Klienci. */
  clientId: string | null;
  /** Krótka notatka „O mnie”. */
  aboutMe: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  dailyHoursLimit?: number | null;
  weeklyHoursLimit?: number | null;
  baseLocation?: string;
  costRate?: number | null;
  isAvailableForPlanning?: boolean;
  supervisorId?: string | null;
  monthlyReviewEnabled?: boolean;
  offerApprovalBypass?: boolean;
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  manager: "Manager",
  instalator: "Instalator",
  office: "Office",
  podwykonawca: "Podwykonawca",
  klient: "Klient",
  gosc: "Gość",
};

export function getUserDisplayName(profile: Pick<UserProfile, "firstName" | "lastName" | "email">) {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  return fullName || profile.email;
}

export function isAdministratorRole(role: UserRole) {
  return role === "administrator";
}

export function hasFullAppAccess(role: UserRole) {
  return role === "administrator" || role === "manager";
}

export function isIntegrationOperator(role: UserRole) {
  return role === "administrator" || role === "manager" || role === "instalator";
}
