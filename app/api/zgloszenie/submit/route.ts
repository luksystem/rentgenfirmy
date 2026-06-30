import { NextResponse } from "next/server";
import {
  SERVICE_INTAKE_PRIORITIES,
  type ServiceIntakePriority,
} from "@/lib/service-intake/types";
import { submitServiceIntakeRequest } from "@/lib/supabase/service-intake-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      verificationToken?: string;
      projectId?: string;
      priority?: ServiceIntakePriority;
      description?: string;
      contactPhone?: string;
      acceptedPaidTerms?: boolean;
    };

    const priority = body.priority ?? "standard";
    if (!SERVICE_INTAKE_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "Nieprawidłowy priorytet." }, { status: 400 });
    }

    const record = await submitServiceIntakeRequest({
      verificationToken: body.verificationToken?.trim() ?? "",
      projectId: body.projectId?.trim() ?? "",
      priority,
      description: body.description ?? "",
      contactPhone: body.contactPhone ?? null,
      acceptedPaidTerms: Boolean(body.acceptedPaidTerms),
    });

    return NextResponse.json({
      ok: true,
      referenceNumber: record.referenceNumber,
      trackingToken: record.trackingToken,
      message: "Zgłoszenie zostało wysłane. Skontaktujemy się wkrótce.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia." },
      { status: 400 },
    );
  }
}
