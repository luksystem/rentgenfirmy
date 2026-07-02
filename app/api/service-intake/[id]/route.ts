import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  SERVICE_INTAKE_STATUSES,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import {
  addServiceIntakeTeamComment,
  getServiceIntakeThreadById,
  updateServiceIntakeStatus,
} from "@/lib/supabase/service-intake-server";

export async function GET(
  _request: Request,
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
    const thread = await getServiceIntakeThreadById(id);
    if (!thread) {
      return NextResponse.json({ error: "Nie znaleziono zgłoszenia." }, { status: 404 });
    }
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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
    const body = (await request.json()) as { status?: ServiceIntakeStatus };

    if (!body.status || !SERVICE_INTAKE_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
    }

    const item = await updateServiceIntakeStatus(id, body.status);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd aktualizacji." },
      { status: 500 },
    );
  }
}

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
    const body = (await request.json()) as { message?: string; authorName?: string };
    const comment = await addServiceIntakeTeamComment({
      intakeId: id,
      authorName: body.authorName?.trim() || user.email || "Zespół",
      body: body.message ?? "",
    });
    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wysłać wiadomości." },
      { status: 400 },
    );
  }
}
