import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  INSPECTION_FREQUENCIES,
  type InspectionFrequency,
  type InspectionPlanInput,
} from "@/lib/inspections/types";
import { planInspectionsForClient } from "@/lib/supabase/inspection-server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as InspectionPlanInput;

    if (!body.clientId?.trim()) {
      return NextResponse.json({ error: "Wybierz klienta." }, { status: 400 });
    }

    if (!body.systems?.length) {
      return NextResponse.json({ error: "Wybierz co najmniej jeden system." }, { status: 400 });
    }

    for (const system of body.systems) {
      if (!system.systemCode?.trim()) {
        return NextResponse.json({ error: "Brak kodu systemu." }, { status: 400 });
      }
      if (!INSPECTION_FREQUENCIES.includes(system.frequency as InspectionFrequency)) {
        return NextResponse.json({ error: "Nieprawidłowa częstotliwość." }, { status: 400 });
      }
      if (!system.scheduleMonths?.length) {
        return NextResponse.json({ error: "Wybierz miesiące planowania." }, { status: 400 });
      }
    }

    const created = await planInspectionsForClient(body);
    return NextResponse.json({ ok: true, createdCount: created.length, items: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zaplanować przeglądów." },
      { status: 400 },
    );
  }
}
