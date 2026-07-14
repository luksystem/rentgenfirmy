import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import type { VizAlarmRuleInput } from "@/lib/viz/project-contact-types";
import {
  createVizAlarmRule,
  deleteVizAlarmRule,
  listVizAlarmRules,
} from "@/lib/viz/viz-alarm-rules-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const rules = await listVizAlarmRules(dashboardId);
    return NextResponse.json({ rules });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania reguł." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const body = (await request.json()) as VizAlarmRuleInput;

    if (!body.name?.trim() || !body.roleCode?.trim()) {
      return NextResponse.json({ error: "Nazwa i rola są wymagane." }, { status: 400 });
    }

    if (body.thresholdNumeric == null || Number.isNaN(Number(body.thresholdNumeric))) {
      return NextResponse.json({ error: "Próg musi być liczbą." }, { status: 400 });
    }

    const rule = await createVizAlarmRule(dashboardId, body);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd tworzenia reguły." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora reguły." }, { status: 400 });
    }
    await deleteVizAlarmRule(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania reguły." },
      { status: 500 },
    );
  }
}
