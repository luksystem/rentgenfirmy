import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { toggleInspectionReaction } from "@/lib/supabase/inspection-server";
import { INSPECTION_REACTION_EMOJIS, type InspectionReactionEmoji } from "@/lib/inspections/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { emoji?: string; authorName?: string };

    if (!body.emoji || !INSPECTION_REACTION_EMOJIS.includes(body.emoji as InspectionReactionEmoji)) {
      return NextResponse.json({ error: "Nieprawidłowa reakcja." }, { status: 400 });
    }

    const authorName = body.authorName?.trim() || user.email?.trim() || "Zespół";

    const reaction = await toggleInspectionReaction({
      inspectionId: id,
      emoji: body.emoji as InspectionReactionEmoji,
      authorProfileId: user.id,
      authorName,
    });

    return NextResponse.json({ reaction, removed: !reaction });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać reakcji." },
      { status: 400 },
    );
  }
}
