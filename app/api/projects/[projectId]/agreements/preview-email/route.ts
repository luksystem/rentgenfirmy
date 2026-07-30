import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  previewAgreementEmailServer,
  type AgreementEmailScope,
} from "@/lib/supabase/agreement-email-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      scope?: AgreementEmailScope;
      agreementId?: string;
      tradeId?: string;
      note?: string;
    };

    if (!body.scope) {
      return NextResponse.json({ error: "Brak zakresu wysyłki." }, { status: 400 });
    }

    const preview = await previewAgreementEmailServer({
      projectId,
      scope: body.scope,
      agreementId: body.agreementId,
      tradeId: body.tradeId,
      note: body.note,
    });

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przygotowania podglądu." },
      { status: 500 },
    );
  }
}
