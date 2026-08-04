import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { previewStageReportEmailServer } from "@/lib/supabase/stage-report-email-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reportId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { note?: string };

    const preview = await previewStageReportEmailServer({ reportId, note: body.note });
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przygotowania podglądu." },
      { status: 500 },
    );
  }
}
