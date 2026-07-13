import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessPathByNavPermissions,
  isAdminRoute,
  isPublicAppRoute,
  shouldCheckNavModuleAccess,
} from "@/lib/auth/routes";
import { normalizeRoleNavPermissionsConfig, ROLE_NAV_PERMISSIONS_SETTINGS_ID } from "@/lib/navigation/role-nav-permissions";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/auth/types";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isPublic =
    isPublicAppRoute(pathname) ||
    pathname.startsWith("/api/oferta/") ||
    pathname.startsWith("/api/kanban/") ||
    pathname.startsWith("/api/odbior/") ||
    pathname.startsWith("/api/element/") ||
    pathname.startsWith("/api/przestrzen/") ||
    pathname.startsWith("/api/ustalenie/") ||
    pathname.startsWith("/api/zgloszenie/") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/sms/status-webhook");

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("data")
      .eq("id", ROLE_NAV_PERMISSIONS_SETTINGS_ID)
      .maybeSingle();

    const navConfig = normalizeRoleNavPermissionsConfig(settingsRow?.data);
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
