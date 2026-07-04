import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  fetchInspectionGlobalSettings,
  saveInspectionGlobalSettings,
} from "@/lib/supabase/inspection-server";
import { normalizeInspectionGlobalSettings } from "@/lib/inspections/defaults";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await fetchInspectionGlobalSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { settings?: unknown };
    const settings = normalizeInspectionGlobalSettings(body.settings);
    const saved = await saveInspectionGlobalSettings(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień." },
      { status: 400 },
    );
  }
}
