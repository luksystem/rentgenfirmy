import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { addInspectionComment } from "@/lib/supabase/inspection-server";

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
    const body = (await request.json()) as { body?: string; authorName?: string };
    const text = body.body?.trim() ?? "";

    if (text.length < 1) {
      return NextResponse.json({ error: "Wpisz komentarz." }, { status: 400 });
    }

    const authorName = body.authorName?.trim() || user.email?.trim() || "Zespół";

    const comment = await addInspectionComment({
      inspectionId: id,
      authorProfileId: user.id,
      authorName,
      body: text,
    });

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się dodać komentarza." },
      { status: 400 },
    );
  }
}
