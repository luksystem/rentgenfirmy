import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { sendContractEmailServer } from "@/lib/supabase/contract-send-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { note?: string } | null;

    const { contract, emailSkipped } = await sendContractEmailServer({
      contractId: id,
      note: body?.note,
    });

    return NextResponse.json({ contract, emailSkipped });
  } catch (error) {
    return jsonError(error);
  }
}
