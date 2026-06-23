import { NextResponse, type NextRequest } from "next/server";
import { isAdminRoute, isPublicAppRoute } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isPublic =
    isPublicAppRoute(pathname) ||
    pathname.startsWith("/api/oferta/") ||
    pathname.startsWith("/api/kanban/") ||
    pathname.startsWith("/api/przestrzen/") ||
    pathname.startsWith("/api/ustalenie/");

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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
