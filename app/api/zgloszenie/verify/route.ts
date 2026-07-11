import { NextResponse } from "next/server";
import { verifyServiceIntakeIdentity } from "@/lib/supabase/service-intake-server";

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

    const result = await verifyServiceIntakeIdentity({
      sessionToken,
      email,
      firstName,
      lastName,
      fullName,
    });

    if (!result) {
      return NextResponse.json({
        ok: false,
        code: "verification_failed",
        message:
          "Nie udało się potwierdzić tożsamości. Prawdopodobnie nie jesteś naszym klientem albo wpisałeś błędne dane.",
      });
    }

    if (result.projects.length === 0) {
      return NextResponse.json({
        ok: false,
        code: "no_projects",
        message:
          "Nie znaleźliśmy przypisanych obiektów do tego konta. Możesz poprawić dane albo kontynuować jako nowy kontakt.",
      });
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd weryfikacji." },
      { status: 500 },
    );
  }
}
