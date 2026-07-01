import { NextResponse } from "next/server";
import {
  SERVICE_INTAKE_POST_WARRANTY_ACTIONS,
  SERVICE_INTAKE_PRIORITIES,
  SERVICE_INTAKE_REQUEST_TYPES,
  type ServiceIntakePostWarrantyAction,
  type ServiceIntakePriority,
  type ServiceIntakeRequestType,
} from "@/lib/service-intake/types";
import { submitServiceIntakeRequest } from "@/lib/supabase/service-intake-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      verificationToken?: string;
      projectId?: string;
      requestType?: ServiceIntakeRequestType;
      priority?: ServiceIntakePriority | null;
      postWarrantyAction?: ServiceIntakePostWarrantyAction | null;
      description?: string;
      contactPhone?: string;
      acceptedPaidTerms?: boolean;
    };

    const requestType = body.requestType ?? "service";
    if (!SERVICE_INTAKE_REQUEST_TYPES.includes(requestType)) {
      return NextResponse.json({ error: "Nieprawidłowy rodzaj zgłoszenia." }, { status: 400 });
    }

    const priority = body.priority ?? null;
    if (priority !== null && !SERVICE_INTAKE_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "Nieprawidłowy priorytet." }, { status: 400 });
    }

    const postWarrantyAction = body.postWarrantyAction ?? null;
    if (
      postWarrantyAction !== null &&
      !SERVICE_INTAKE_POST_WARRANTY_ACTIONS.includes(postWarrantyAction)
    ) {
      return NextResponse.json({ error: "Nieprawidłowy sposób działania." }, { status: 400 });
    }

    const record = await submitServiceIntakeRequest({
      verificationToken: body.verificationToken?.trim() ?? "",
      projectId: body.projectId?.trim() ?? "",
      requestType,
      priority,
      postWarrantyAction,
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
