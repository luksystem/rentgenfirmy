import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { countServiceIntakeAlerts } from "@/lib/supabase/service-intake-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await countServiceIntakeAlerts();
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}
