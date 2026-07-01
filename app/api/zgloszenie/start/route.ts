import { NextResponse } from "next/server";
import { createIntakeSessionToken } from "@/lib/service-intake/tokens";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
    }

    const sessionToken = createIntakeSessionToken(email);

    return NextResponse.json({
      sessionToken,
      message: "Podaj imię i nazwisko, aby potwierdzić tożsamość.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się rozpocząć zgłoszenia." },
      { status: 500 },
    );
  }
}
