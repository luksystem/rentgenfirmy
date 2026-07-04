import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  SERVICE_INTAKE_REQUEST_TYPES,
  SERVICE_INTAKE_STATUSES,
  type ServiceIntakeRequestType,
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

    const requestTypeParam = url.searchParams.get("requestType");
    const requestType =
      requestTypeParam &&
      SERVICE_INTAKE_REQUEST_TYPES.includes(requestTypeParam as ServiceIntakeRequestType)
        ? (requestTypeParam as ServiceIntakeRequestType)
        : undefined;

    const items = await listServiceIntakeRequests({ status, requestType });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania zgłoszeń." },
      { status: 500 },
    );
  }
}
