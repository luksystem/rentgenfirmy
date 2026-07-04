import { NextResponse } from "next/server";
import { createGuestIntakeSession } from "@/lib/supabase/service-intake-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionToken?: string;
      email?: string;
      fullName?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const sessionToken = body.sessionToken?.trim() ?? "";

    if (!sessionToken || !email || !fullName) {
      return NextResponse.json({ error: "Uzupełnij wszystkie pola." }, { status: 400 });
    }

    const result = await createGuestIntakeSession({ sessionToken, email, fullName });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się kontynuować jako gość." },
      { status: 400 },
    );
  }
}
