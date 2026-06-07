import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, first_name, last_name, phone, role")
      .eq("id", id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${origin}/auth/callback?next=/konto/haslo`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
