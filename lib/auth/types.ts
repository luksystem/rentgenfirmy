export const USER_ROLES = [
  "administrator",
  "manager",
  "pracownik",
  "klient",
  "gosc",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

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
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  manager: "Manager",
  pracownik: "Pracownik",
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
  return role === "administrator" || role === "manager" || role === "pracownik";
}
