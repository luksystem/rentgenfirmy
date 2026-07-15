import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  AVATARS_BUCKET,
  extensionForAvatarMimeType,
  getAvatarPublicUrl,
  validateAvatarFile,
} from "@/lib/auth/avatar";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof requireAuthenticatedProfile>>;
  try {
    session = await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku zdjęcia." }, { status: 400 });
    }
    validateAvatarFile(file);

    const admin = getSupabaseAdmin();
    const ext = extensionForAvatarMimeType(file.type || "image/jpeg");
    const storagePath = `${session.profile.id}/avatar.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(AVATARS_BUCKET).upload(storagePath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
      cacheControl: "3600",
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const publicUrl = getAvatarPublicUrl(storagePath);
    if (!publicUrl) {
      throw new Error("Nie udało się zbudować URL awatara.");
    }

    // cache-bust
    const avatarUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: row, error } = await admin
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.profile.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: mapProfileRow(row), avatarUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wgrać zdjęcia." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  let session: Awaited<ReturnType<typeof requireAuthenticatedProfile>>;
  try {
    session = await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from("profiles")
      .update({
        avatar_url: null,
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
      { error: error instanceof Error ? error.message : "Nie udało się usunąć zdjęcia." },
      { status: 500 },
    );
  }
}
