import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { requireVizPermission } from "@/lib/viz/viz-auth-server";
import { acknowledgeVizAlarms } from "@/lib/viz/viz-alarm-acknowledgements-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

type AcknowledgeBody = {
  projectId?: string;
  ruleId?: string;
  note?: string | null;
  items?: Array<{ projectId: string; ruleId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await requireVizPermission(dashboardId, userId, profile.role, "acknowledgeAlarms");

    const body = (await request.json()) as AcknowledgeBody;
    const items =
      body.items ??
      (body.projectId && body.ruleId
        ? [{ projectId: body.projectId, ruleId: body.ruleId }]
        : []);

    if (!items.length) {
      return NextResponse.json(
        { error: "Podaj projectId i ruleId lub listę items." },
        { status: 400 },
      );
    }

    const acknowledgements = await acknowledgeVizAlarms({
      dashboardId,
      userId,
      items,
      note: body.note,
    });

    return NextResponse.json({ acknowledgements });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd potwierdzania alarmu." },
      { status: 500 },
    );
  }
}
