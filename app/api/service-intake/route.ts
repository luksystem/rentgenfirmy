import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  SERVICE_INTAKE_STATUSES,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import { listServiceIntakeRequests } from "@/lib/supabase/service-intake-server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam && SERVICE_INTAKE_STATUSES.includes(statusParam as ServiceIntakeStatus)
        ? (statusParam as ServiceIntakeStatus)
        : undefined;

    const items = await listServiceIntakeRequests(status);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania zgłoszeń." },
      { status: 500 },
    );
  }
}
