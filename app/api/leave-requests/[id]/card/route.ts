import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer } from "@/lib/supabase/leave-request-server";
import { LEAVE_CARDS_BUCKET } from "@/lib/supabase/leave-card-repository";

/** Podpisany link do karty urlopowej PDF — do pobrania/wydruku/udostępnienia. Ważny 7 dni,
 * żeby "udostępnij" (skopiowanie linku) miało sens bez budowania osobnej strony publicznej. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const item = await fetchLeaveRequestByIdServer(admin, id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    const isAdmin = isAdministratorRole(profile.role);
    const canAccess = isAdmin || item.profileId === userId || item.supervisorId === userId;
    if (!canAccess) {
      return NextResponse.json({ error: "Brak dostępu do tej karty urlopowej." }, { status: 403 });
    }

    if (!item.generatedPdfPath) {
      return NextResponse.json({ error: "Karta urlopowa nie została jeszcze wygenerowana." }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from(LEAVE_CARDS_BUCKET)
      .createSignedUrl(item.generatedPdfPath, 60 * 60 * 24 * 7);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Nie udało się wygenerować linku do karty urlopowej.");
    }

    return NextResponse.json({ url: data.signedUrl, name: item.generatedPdfName });
  } catch (error) {
    return jsonError(error);
  }
}
