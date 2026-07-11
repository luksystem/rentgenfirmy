import { NextResponse } from "next/server";
import { createGuestIntakeSession } from "@/lib/supabase/service-intake-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionToken?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const sessionToken = body.sessionToken?.trim() ?? "";
    const hasName = Boolean(lastName || fullName);

    if (!sessionToken || !email || !hasName) {
      return NextResponse.json({ error: "Uzupełnij wszystkie pola." }, { status: 400 });
    }

    const result = await createGuestIntakeSession({
      sessionToken,
      email,
      firstName,
      lastName,
      fullName,
    });

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
