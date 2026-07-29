import { NextResponse } from "next/server";
import { runCommitmentWarningsServer } from "@/lib/notifications/commitment-warnings-server";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.CLIENTS_API_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }
  return header.slice("Bearer ".length) === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCommitmentWarningsServer();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd wysyłki ostrzeżeń o zobowiązaniach." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
