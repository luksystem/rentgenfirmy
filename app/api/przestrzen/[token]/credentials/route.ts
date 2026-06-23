import { NextResponse } from "next/server";
import { requireDashboardPublicSession } from "@/lib/dashboard/dashboard-public-request";
import { fetchPublicDashboardPayload } from "@/lib/supabase/public-dashboard-server";
import { listProjectSystemCredentials } from "@/lib/supabase/project-system-credentials-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const session = await requireDashboardPublicSession(token);
    if (!session.ok) {
      return NextResponse.json({ error: "Brak dostępu do dashboardu." }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const payload = await fetchPublicDashboardPayload(token, projectId);
    if (!payload?.initialProjectId) {
      return NextResponse.json({ credentials: [] });
    }

    const credentials = await listProjectSystemCredentials(payload.initialProjectId, {
      clientVisibleOnly: true,
    });
    return NextResponse.json({ credentials });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania haseł." },
      { status: 500 },
    );
  }
}
