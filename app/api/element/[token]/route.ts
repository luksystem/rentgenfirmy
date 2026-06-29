import { NextResponse } from "next/server";
import { normalizeChecklistPayload } from "@/lib/process/item-payload";
import type { ChecklistItemPayload } from "@/lib/process/types";
import { fetchPublicProcessItemByToken } from "@/lib/supabase/process-public-server";
import { savePublicChecklistPayload } from "@/lib/supabase/process-public-mutations";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const payload = await fetchPublicProcessItemByToken(token);

  if (!payload || payload.isInternalAcceptance) {
    return NextResponse.json({ error: "Nie znaleziono publicznego elementu." }, { status: 404 });
  }

  return NextResponse.json({ item: payload });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const body = (await request.json()) as {
      checklist?: ChecklistItemPayload;
      actorName?: string;
    };

    if (!body.checklist) {
      return NextResponse.json({ error: "Brak danych checklisty." }, { status: 400 });
    }

    const saved = await savePublicChecklistPayload(
      token,
      normalizeChecklistPayload(body.checklist),
    );

    return NextResponse.json({
      checklist: saved.payload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu." },
      { status: 400 },
    );
  }
}
