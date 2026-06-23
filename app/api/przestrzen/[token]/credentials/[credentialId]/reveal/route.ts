import { NextResponse } from "next/server";
import { requireDashboardPublicSession } from "@/lib/dashboard/dashboard-public-request";
import { fetchPublicDashboardPayload } from "@/lib/supabase/public-dashboard-server";
import {
  getProjectSystemCredentialMeta,
  revealProjectSystemCredentialPassword,
} from "@/lib/supabase/project-system-credentials-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string; credentialId: string }> },
) {
  const { token, credentialId } = await context.params;

  try {
    const session = await requireDashboardPublicSession(token);
    if (!session.ok) {
      return NextResponse.json({ error: "Brak dostępu do dashboardu." }, { status: 401 });
    }

    const meta = await getProjectSystemCredentialMeta(credentialId);
    if (!meta || !meta.visibleToClient) {
      return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
    }

    const payload = await fetchPublicDashboardPayload(token, meta.projectId);
    if (!payload?.projects.some((project) => project.id === meta.projectId)) {
      return NextResponse.json({ error: "Brak dostępu do tego projektu." }, { status: 403 });
    }

    const password = await revealProjectSystemCredentialPassword(credentialId);
    return NextResponse.json({ password });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd odszyfrowania hasła." },
      { status: 400 },
    );
  }
}
