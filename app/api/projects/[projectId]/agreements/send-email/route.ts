import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import {
  listTradePendingAgreementCounts,
  sendProjectAgreementEmails,
  type AgreementEmailScope,
} from "@/lib/supabase/agreement-email-server";

export async function GET(
  _request: Request,
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
    const pending = await listTradePendingAgreementCounts(projectId);
    return NextResponse.json({ tradeBatches: pending });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania podglądu wysyłki." },
      { status: 500 },
    );
  }
}

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
    const body = (await request.json()) as {
      scope?: AgreementEmailScope;
      agreementId?: string;
      tradeId?: string;
    };

    if (!body.scope) {
      return NextResponse.json({ error: "Brak zakresu wysyłki." }, { status: 400 });
    }

    const result = await sendProjectAgreementEmails({
      projectId,
      scope: body.scope,
      agreementId: body.agreementId,
      tradeId: body.tradeId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd wysyłki e-mail." },
      { status: 500 },
    );
  }
}
