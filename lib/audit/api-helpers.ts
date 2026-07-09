import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { getSession } from "@/lib/supabase/audit-repository";
import type { AuditSession } from "@/lib/audit/types";

export async function requireOwnedSession(
  id: string,
): Promise<{ userId: string; session: AuditSession }> {
  const { userId } = await requireAuthenticatedProfile();
  const session = await getSession(id);
  if (!session) throw new HttpError(404, "Nie znaleziono audytu.");
  if (session.ownerId !== userId) throw new HttpError(403, "Brak dostępu do audytu.");
  return { userId, session };
}
