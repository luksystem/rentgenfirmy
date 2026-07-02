import { NextResponse } from "next/server";
import {
  addServiceIntakeComment,
  getServiceIntakeThreadByToken,
} from "@/lib/supabase/service-intake-server";
import { createClient } from "@/lib/supabase/server-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const thread = await getServiceIntakeThreadByToken(token);
    if (!thread) {
      return NextResponse.json({ error: "Nie znaleziono wątku." }, { status: 404 });
    }
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania wątku." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as {
      message?: string;
      authorName?: string;
      authorSide?: "client" | "team";
    };

    const authorSide = body.authorSide ?? "client";
    let authorName = body.authorName?.trim() ?? "";

    if (authorSide === "team") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      authorName = authorName || user.email || "Zespół";
    }

    if (!authorName) {
      return NextResponse.json({ error: "Podaj imię i nazwisko." }, { status: 400 });
    }

    const comment = await addServiceIntakeComment({
      trackingToken: token,
      authorName,
      authorSide,
      body: body.message ?? "",
    });

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wysłać wiadomości." },
      { status: 400 },
    );
  }
}
