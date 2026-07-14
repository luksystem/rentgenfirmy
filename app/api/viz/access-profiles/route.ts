import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { listVizAccessCandidateProfiles } from "@/lib/viz/viz-auth-server";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const profiles = await listVizAccessCandidateProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania użytkowników." },
      { status: 500 },
    );
  }
}
