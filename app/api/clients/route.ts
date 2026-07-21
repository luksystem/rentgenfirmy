import { NextResponse } from "next/server";
import { splitPartyFullName } from "@/lib/party/display-name";
import { buildPartyGeocodeQueries, resolvePartyGpsOnSave } from "@/lib/party/gps";
import { geocodeAddressServer } from "@/lib/service/geocode-server";
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

  let firstName =
    typeof data.firstName === "string"
      ? data.firstName
      : typeof data.first_name === "string"
        ? data.first_name
        : "";

  let lastName =
    typeof data.lastName === "string"
      ? data.lastName
      : typeof data.last_name === "string"
        ? data.last_name
        : "";

  if (!lastName.trim() && typeof data.fullName === "string" && data.fullName.trim()) {
    const split = splitPartyFullName(data.fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  if (!lastName.trim()) {
    return null;
  }

  return {
    firstName,
    lastName,
    location: typeof data.location === "string" ? data.location : "",
    addressStreet:
      typeof data.addressStreet === "string"
        ? data.addressStreet
        : typeof data.address_street === "string"
          ? data.address_street
          : "",
    addressCity:
      typeof data.addressCity === "string"
        ? data.addressCity
        : typeof data.address_city === "string"
          ? data.address_city
          : "",
    addressPostalCode:
      typeof data.addressPostalCode === "string"
        ? data.addressPostalCode
        : typeof data.address_postal_code === "string"
          ? data.address_postal_code
          : "",
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

async function resolveGpsForApi(input: ClientInput, previous: ClientInput | null) {
  const gps = await resolvePartyGpsOnSave(input, previous, async (party) => {
    for (const query of buildPartyGeocodeQueries(party)) {
      const result = await geocodeAddressServer(query);
      if (result) {
        return result;
      }
    }
    return null;
  });
  return { ...input, lat: gps.lat, lng: gps.lng, gpsManual: gps.gpsManual };
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
    return NextResponse.json({ error: "lastName is required" }, { status: 400 });
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
        const previous = rowToClient(existing);
        const resolved = await resolveGpsForApi(input, previous);
        const { data, error } = await supabase
          .from("clients")
          .update({
            ...clientInputToInsert(resolved, { updatedAt: new Date().toISOString() }),
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

    const resolved = await resolveGpsForApi(input, null);
    const { data, error } = await supabase
      .from("clients")
      .insert(clientInputToInsert(resolved))
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
