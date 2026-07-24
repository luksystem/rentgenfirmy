import type { UserRole } from "@/lib/auth/types";
import { isAdministratorRole } from "@/lib/auth/types";
import { resolveNavModuleForPath, type NavModuleKey } from "@/lib/navigation/nav-modules";
import {
  canAccessNavModule,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";

const PUBLIC_PATH_PREFIXES = ["/logowanie", "/rejestracja", "/auth", "/oferta", "/kanban", "/odbior", "/element", "/przestrzen", "/ustalenie", "/zmiana", "/zgloszenie", "/public", "/sri", "/ankieta"] as const;

export function isPublicAppRoute(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isRoleNavPermissionsAdminRoute(pathname: string) {
  return pathname === "/ustawienia/uprawnienia" || pathname.startsWith("/ustawienia/uprawnienia/");
}

export function isReportKpiSettingsAdminRoute(pathname: string) {
  return pathname === "/raport/ustawienia-kpi" || pathname.startsWith("/raport/ustawienia-kpi/");
}

export function shouldCheckNavModuleAccess(pathname: string) {
  if (isPublicAppRoute(pathname)) {
    return false;
  }
  if (isAdminRoute(pathname)) {
    return false;
  }
  if (pathname.startsWith("/api/")) {
    return false;
  }
  if (pathname === "/logowanie" || pathname === "/rejestracja") {
    return false;
  }
  return resolveNavModuleForPath(pathname) != null;
}

export function canAccessPathByNavPermissions(
  pathname: string,
  role: UserRole,
  config: RoleNavPermissionsConfig,
): boolean {
  if (
    isRoleNavPermissionsAdminRoute(pathname) ||
    isReportKpiSettingsAdminRoute(pathname) ||
    isAdminRoute(pathname)
  ) {
    return isAdministratorRole(role);
  }

  if (isAdministratorRole(role)) {
    return true;
  }

  const navModule = resolveNavModuleForPath(pathname);
  if (!navModule) {
    return true;
  }

  if (navModule.routePrefixes.some((prefix) => prefix === "/admin" || prefix.startsWith("/admin"))) {
    return isAdministratorRole(role);
  }

  return canAccessNavModule(role, navModule.key as NavModuleKey, config);
}
