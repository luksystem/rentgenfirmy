import { NextResponse } from "next/server";
import { verifyServiceIntakeIdentity } from "@/lib/supabase/service-intake-server";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionToken?: string;
      email?: string;
      fullName?: string;
      captchaToken?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const sessionToken = body.sessionToken?.trim() ?? "";

    if (!sessionToken || !email || !fullName) {
      return NextResponse.json({ error: "Uzupełnij wszystkie pola." }, { status: 400 });
    }

    const captchaOk = await verifyTurnstileToken(
      body.captchaToken,
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    );

    if (!captchaOk) {
      return NextResponse.json({ error: "Potwierdź zabezpieczenie antyspamowe." }, { status: 400 });
    }

    const result = await verifyServiceIntakeIdentity({ sessionToken, email, fullName });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Nie udało się zweryfikować danych. Sprawdź e-mail i imię/nazwisko albo skontaktuj się z nami telefonicznie.",
        },
        { status: 403 },
      );
    }

    if (result.projects.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nie znaleźliśmy przypisanych obiektów do tego konta. Skontaktuj się z nami, aby dokończyć zgłoszenie.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd weryfikacji." },
      { status: 500 },
    );
  }
}
