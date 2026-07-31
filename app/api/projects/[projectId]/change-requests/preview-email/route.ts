import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  previewChangeRequestEmailServer,
  type ChangeRequestEmailScope,
} from "@/lib/supabase/change-request-email-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      scope?: ChangeRequestEmailScope;
      changeRequestId?: string;
      changeRequestIds?: string[];
      note?: string;
    };

    if (!body.scope) {
      return NextResponse.json({ error: "Brak zakresu wysyłki." }, { status: 400 });
    }

    const preview = await previewChangeRequestEmailServer({
      projectId,
      scope: body.scope,
      changeRequestId: body.changeRequestId,
      changeRequestIds: body.changeRequestIds,
      note: body.note,
    });

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przygotowania podglądu." },
      { status: 500 },
    );
  }
}
