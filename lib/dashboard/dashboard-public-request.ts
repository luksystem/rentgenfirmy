import { cookies } from "next/headers";
import {
  createDashboardSessionValue,
  DASHBOARD_PUBLIC_SESSION_COOKIE,
  parseDashboardSessionValue,
} from "@/lib/dashboard/dashboard-session";
import {
  fetchDashboardSpaceAccessByToken,
  type DashboardSpaceAccessRecord,
} from "@/lib/supabase/public-dashboard-server";

export async function getDashboardPublicSessionAuthor(token: string) {
  const cookieStore = await cookies();
  const session = parseDashboardSessionValue(
    cookieStore.get(DASHBOARD_PUBLIC_SESSION_COOKIE)?.value,
  );
  if (!session || session.token !== token) {
    return null;
  }
  return session.authorName;
}

export async function isDashboardPublicSessionValid(token: string) {
  return Boolean(await getDashboardPublicSessionAuthor(token));
}

export function buildDashboardSessionCookie(token: string, authorName: string) {
  return {
    name: DASHBOARD_PUBLIC_SESSION_COOKIE,
    value: createDashboardSessionValue(token, authorName),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    },
  };
}

export async function requireDashboardPublicSession(
  token: string,
): Promise<{ ok: true; authorName: string; access: DashboardSpaceAccessRecord } | { ok: false }> {
  const access = await fetchDashboardSpaceAccessByToken(token);
  if (!access) {
    return { ok: false };
  }

  if (!access.passwordHash) {
    return { ok: true, authorName: access.authorName, access };
  }

  const authorName = await getDashboardPublicSessionAuthor(token);
  if (!authorName) {
    return { ok: false };
  }

  return { ok: true, authorName, access };
}
