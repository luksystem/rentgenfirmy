import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  SERVICE_INTAKE_STATUSES,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import { updateServiceIntakeStatus } from "@/lib/supabase/service-intake-server";

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
