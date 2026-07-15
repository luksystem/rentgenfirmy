import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  let session: Awaited<ReturnType<typeof requireAuthenticatedProfile>>;
  try {
    session = await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
  const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const aboutMe = typeof data.aboutMe === "string" ? data.aboutMe.trim().slice(0, 500) : "";

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Podaj imię i nazwisko." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        about_me: aboutMe,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.profile.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: mapProfileRow(row) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać profilu." },
      { status: 500 },
    );
  }
}
