import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { sendSms } from "@/lib/sms/sendSms";

type SendSmsBody = {
  phone?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    await requireAdministratorProfile();

    const body = (await request.json()) as SendSmsBody;
    const phone = body.phone?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Pola phone i message są wymagane." },
        { status: 400 },
      );
    }

    const result = await sendSms({
      phone,
      message,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({
      ok: result.status === "sent",
      item: result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
