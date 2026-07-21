import { NextResponse } from "next/server";

/** Limit na IP — chroni przed stormem z klienta (np. zrestartowana pętla mapy). */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const hitsByIp = new Map<string, number[]>();

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowRequest(ip: string) {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) ?? []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hitsByIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  hitsByIp.set(ip, recent);
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Parametr q jest wymagany." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (!allowRequest(ip)) {
    return NextResponse.json(
      { error: "Zbyt wiele zapytań geokodowania. Spróbuj za chwilę." },
      { status: 429 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "pl");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "RentgenFirmy/1.0 (client map geocode)",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Geokoder niedostępny.", status: response.status },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;

    const hit = payload[0];
    if (!hit) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: {
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        label: hit.display_name ?? query,
      },
    });
  } catch {
    return NextResponse.json({ error: "Błąd geokodowania." }, { status: 500 });
  }
}
