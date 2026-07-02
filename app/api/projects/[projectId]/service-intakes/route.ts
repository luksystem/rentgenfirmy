import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { listServiceIntakeByProject } from "@/lib/supabase/service-intake-server";

export async function GET(
  _request: Request,
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
    const items = await listServiceIntakeByProject(projectId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania zgłoszeń." },
      { status: 500 },
    );
  }
}
