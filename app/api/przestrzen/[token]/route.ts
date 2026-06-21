import { NextResponse } from "next/server";
import { fetchPublicDashboardPayload } from "@/lib/supabase/public-dashboard-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;

  try {
    const payload = await fetchPublicDashboardPayload(token, projectId);
    if (!payload) {
      return NextResponse.json({ error: "Nie znaleziono dashboardu klienta." }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania dashboardu." },
      { status: 500 },
    );
  }
}
