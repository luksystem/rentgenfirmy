import { NextResponse } from "next/server";
import type { InternalAcceptanceItemState } from "@/lib/internal-acceptance/types";
import { fetchPublicProcessItemByToken } from "@/lib/supabase/process-public-server";
import { savePublicInternalAcceptanceItemPatch } from "@/lib/supabase/process-public-mutations";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const payload = await fetchPublicProcessItemByToken(token);

  if (!payload || !payload.isInternalAcceptance) {
    return NextResponse.json({ error: "Nie znaleziono publicznej tablicy odbioru." }, { status: 404 });
  }

  return NextResponse.json({ item: payload });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const body = (await request.json()) as {
      itemKey?: string;
      patch?: Partial<InternalAcceptanceItemState>;
      actorName?: string;
    };

    if (!body.itemKey || !body.patch) {
      return NextResponse.json({ error: "Brak danych pozycji." }, { status: 400 });
    }

    const saved = await savePublicInternalAcceptanceItemPatch(
      token,
      body.itemKey,
      body.patch,
      { name: body.actorName?.trim() || "Gość" },
    );

    return NextResponse.json({
      internalAcceptance: saved.internalAcceptanceState,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu." },
      { status: 400 },
    );
  }
}
