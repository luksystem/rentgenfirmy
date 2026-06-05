import { NextResponse } from "next/server";
import { clientInputToInsert, rowToClient } from "@/lib/supabase/client-mappers";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ClientInput } from "@/lib/service/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function parseClientBody(body: unknown): ClientInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const data = body as Record<string, unknown>;
  const fullName =
    typeof data.fullName === "string"
      ? data.fullName
      : typeof data.full_name === "string"
        ? data.full_name
        : "";

  if (!fullName.trim()) {
    return null;
  }

  return {
    fullName,
    location: typeof data.location === "string" ? data.location : "",
    email: typeof data.email === "string" ? data.email : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    notes: typeof data.notes === "string" ? data.notes : undefined,
    externalId:
      typeof data.externalId === "string"
        ? data.externalId
        : typeof data.external_id === "string"
          ? data.external_id
          : null,
  };
}

function isAuthorized(request: Request) {
  const secret = process.env.CLIENTS_API_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  return header.slice("Bearer ".length) === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseClientBody(body);
  if (!input) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServer();

    if (input.externalId?.trim()) {
      const { data: existing } = await supabase
        .from("clients")
        .select("*")
        .eq("external_id", input.externalId.trim())
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("clients")
          .update({
            ...clientInputToInsert(input, { updatedAt: new Date().toISOString() }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return NextResponse.json(rowToClient(data));
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert(clientInputToInsert(input))
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(rowToClient(data), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create client" },
      { status: 500 },
    );
  }
}
