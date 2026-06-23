import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import {
  getProjectSystemCredentialMeta,
  revealProjectSystemCredentialPassword,
} from "@/lib/supabase/project-system-credentials-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ credentialId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { credentialId } = await context.params;
    const meta = await getProjectSystemCredentialMeta(credentialId);
    if (!meta) {
      return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
    }

    const password = await revealProjectSystemCredentialPassword(credentialId);
    return NextResponse.json({ password });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd odszyfrowania hasła." },
      { status: 400 },
    );
  }
}
