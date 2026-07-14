import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { resolveVizAccessContext } from "@/lib/viz/viz-auth-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const access = await resolveVizAccessContext(dashboardId, userId, profile.role);

    if (!access?.permissions.viewDashboard) {
      return NextResponse.json({ error: "Brak dostępu do dashboardu." }, { status: 403 });
    }

    return NextResponse.json({
      accessRole: access.accessRole,
      permissions: access.permissions,
      canManage: access.canManage,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania sesji dashboardu." },
      { status: 500 },
    );
  }
}
