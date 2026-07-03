import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { SMS_RULE_TRIGGERS, type SmsRuleTrigger } from "@/lib/sms/sms-rules";
import { dispatchSmsRules } from "@/lib/supabase/sms-rules-server";

function parseTrigger(value: unknown): SmsRuleTrigger | null {
  return typeof value === "string" && SMS_RULE_TRIGGERS.includes(value as SmsRuleTrigger)
    ? (value as SmsRuleTrigger)
    : null;
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();

    const body = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const trigger = parseTrigger(data.trigger);

    if (!trigger) {
      return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
    }

    const context =
      data.context && typeof data.context === "object"
        ? (data.context as Record<string, unknown>)
        : {};

    const result = await dispatchSmsRules(trigger, {
      clientId: typeof context.clientId === "string" ? context.clientId : undefined,
      phone: typeof context.phone === "string" ? context.phone : undefined,
      fullName: typeof context.fullName === "string" ? context.fullName : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
