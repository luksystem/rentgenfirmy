import { cookies } from "next/headers";
import {
  createKanbanSessionValue,
  KANBAN_PUBLIC_SESSION_COOKIE,
  parseKanbanSessionValue,
} from "@/lib/process/kanban-session";
import {
  fetchKanbanBoardAccessByToken,
  type KanbanBoardAccessRecord,
} from "@/lib/supabase/kanban-public-server";

export type KanbanPublicAuthorResult =
  | { ok: true; authorName: string; access: KanbanBoardAccessRecord }
  | { ok: false; status: number; error: string };

export async function getKanbanPublicSessionAuthor(token: string) {
  const cookieStore = await cookies();
  const session = parseKanbanSessionValue(cookieStore.get(KANBAN_PUBLIC_SESSION_COOKIE)?.value);
  if (!session || session.token !== token) {
    return null;
  }
  return session.authorName;
}

export async function resolveKanbanPublicAuthor(
  token: string,
  requestedAuthorName?: string,
): Promise<KanbanPublicAuthorResult> {
  const access = await fetchKanbanBoardAccessByToken(token);
  if (!access) {
    return { ok: false, status: 404, error: "Nie znaleziono tablicy." };
  }

  if (access.passwordHash) {
    const authorName = await getKanbanPublicSessionAuthor(token);
    if (!authorName) {
      return { ok: false, status: 401, error: "Wymagane logowanie do tablicy." };
    }
    return { ok: true, authorName, access };
  }

  const authorName = requestedAuthorName?.trim() || "Klient";
  if (!authorName) {
    return { ok: false, status: 400, error: "authorName is required" };
  }

  return { ok: true, authorName, access };
}

export function buildKanbanSessionCookie(token: string, authorName: string) {
  return {
    name: KANBAN_PUBLIC_SESSION_COOKIE,
    value: createKanbanSessionValue(token, authorName),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    },
  };
}
