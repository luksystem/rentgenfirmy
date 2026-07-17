import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessPathByNavPermissions,
  isAdminRoute,
  isPublicAppRoute,
  shouldCheckNavModuleAccess,
} from "@/lib/auth/routes";
import {
  normalizeRoleNavPermissionsConfig,
  ROLE_NAV_PERMISSIONS_SETTINGS_ID,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/auth/types";

const NAV_PERMISSIONS_CACHE_TTL_MS = 60_000;
let navPermissionsCache: { expiresAt: number; config: RoleNavPermissionsConfig } | null = null;

async function getCachedNavPermissions(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
): Promise<RoleNavPermissionsConfig> {
  const now = Date.now();
  if (navPermissionsCache && navPermissionsCache.expiresAt > now) {
    return navPermissionsCache.config;
  }

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", ROLE_NAV_PERMISSIONS_SETTINGS_ID)
    .maybeSingle();

  const config = normalizeRoleNavPermissionsConfig(settingsRow?.data);
  navPermissionsCache = { expiresAt: now + NAV_PERMISSIONS_CACHE_TTL_MS, config };
  return config;
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isPublic =
    isPublicAppRoute(pathname) ||
    pathname.startsWith("/api/oferta/") ||
    pathname.startsWith("/api/kanban/") ||
    pathname.startsWith("/api/odbior/") ||
    pathname.startsWith("/api/element/") ||
    pathname.startsWith("/api/przestrzen/") ||
    pathname.startsWith("/api/ustalenie/") ||
    pathname.startsWith("/api/zmiana/") ||
    pathname.startsWith("/api/zgloszenie/") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/sms/status-webhook");

  if (!user) {
    if (isPublic || pathname.startsWith("/api/auth/")) {
      return supabaseResponse;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/logowanie";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/logowanie" || pathname === "/rejestracja") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  // API routes poza admin: auth w handlerze — unikamy dodatkowego round-tripu profiles.
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/")) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/logowanie";
    loginUrl.searchParams.set("error", "deactivated");
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute(pathname) && profile.role !== "administrator") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  if (pathname.startsWith("/api/admin/") && profile.role !== "administrator") {
    return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403 });
  }

  if (shouldCheckNavModuleAccess(pathname)) {
    const navConfig = await getCachedNavPermissions(supabase);
    const role = profile.role as UserRole;

    if (!canAccessPathByNavPermissions(pathname, role, navConfig)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
