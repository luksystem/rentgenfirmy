import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { buildTestPushPayload } from "@/lib/push/payload";
import { checkPushTestRateLimit } from "@/lib/push/rate-limit";
import { sendPushToUser } from "@/lib/push/send-push";

export async function POST() {
  try {
    const { userId } = await requireAuthenticatedProfile();
    checkPushTestRateLimit(userId);

    const result = await sendPushToUser(userId, buildTestPushPayload());

    if (result.sent === 0 && result.removed === 0) {
      return NextResponse.json(
        {
          error: "Brak aktywnej subskrypcji push na tym koncie. Włącz powiadomienia na urządzeniu.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Poczekaj")) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return jsonError(error);
  }
}
