const PUBLIC_PATH_PREFIXES = ["/logowanie", "/rejestracja", "/auth", "/oferta", "/kanban", "/odbior", "/element", "/przestrzen", "/ustalenie", "/zgloszenie", "/public", "/sri"] as const;

export function isPublicAppRoute(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
