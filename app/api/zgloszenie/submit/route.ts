import { NextResponse } from "next/server";
import {
  SERVICE_INTAKE_PRIORITIES,
  SERVICE_INTAKE_POST_WARRANTY_ACTIONS,
  SERVICE_INTAKE_REQUEST_TYPES,
  SERVICE_INTAKE_WORK_PREFERENCES,
  type ServiceIntakePostWarrantyAction,
  type ServiceIntakePriority,
  type ServiceIntakeRequestType,
  type ServiceIntakeWorkPreference,
} from "@/lib/service-intake/types";
import { readIntakeGuestToken } from "@/lib/service-intake/tokens";
import {
  parseGuestContactAddressBody,
  validateGuestContactAddress,
} from "@/lib/service-intake/guest-address";
import {
  submitGuestServiceIntakeRequest,
  submitServiceIntakeRequest,
} from "@/lib/supabase/service-intake-server";

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
      contactAddress?: {
        addressStreet?: string;
        addressCity?: string;
        addressPostalCode?: string;
      };
      acceptedPaidTerms?: boolean;
      attachments?: Array<{ kind: "image" | "video" | "link"; url: string; label?: string | null }>;
      workPreference?: ServiceIntakeWorkPreference | null;
      preliminaryAccepted?: boolean;
      aiEstimateSnapshot?: unknown;
      estimateClarifications?: string;
    };

    const verificationToken = body.verificationToken?.trim() ?? "";
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

    const workPreference =
      body.workPreference &&
      SERVICE_INTAKE_WORK_PREFERENCES.includes(body.workPreference as ServiceIntakeWorkPreference)
        ? (body.workPreference as ServiceIntakeWorkPreference)
        : null;

    const aiEstimateSnapshot =
      body.aiEstimateSnapshot && typeof body.aiEstimateSnapshot === "object"
        ? (body.aiEstimateSnapshot as Parameters<typeof submitServiceIntakeRequest>[0]["aiEstimateSnapshot"])
        : null;

    const isGuest = Boolean(readIntakeGuestToken(verificationToken));
    const guestContactAddress = isGuest ? parseGuestContactAddressBody(body.contactAddress) : null;
    if (isGuest) {
      const guestAddressError = guestContactAddress
        ? validateGuestContactAddress(guestContactAddress)
        : "Podaj pełny adres obiektu (ulica, kod pocztowy, miasto).";
      if (!guestContactAddress || guestAddressError) {
        return NextResponse.json(
          { error: guestAddressError ?? "Podaj pełny adres obiektu." },
          { status: 400 },
        );
      }
    }

    const record = isGuest
      ? await submitGuestServiceIntakeRequest({
          verificationToken,
          requestType,
          description: body.description ?? "",
          contactPhone: body.contactPhone ?? "",
          contactAddress: guestContactAddress!,
          attachments: body.attachments,
          workPreference,
          preliminaryAccepted: Boolean(body.preliminaryAccepted),
          aiEstimateSnapshot,
          estimateClarifications: body.estimateClarifications?.trim() || null,
        })
      : await submitServiceIntakeRequest({
          verificationToken,
          projectId: body.projectId?.trim() ?? "",
          requestType,
          priority,
          postWarrantyAction,
          description: body.description ?? "",
          contactPhone: body.contactPhone ?? null,
          acceptedPaidTerms: Boolean(body.acceptedPaidTerms),
          attachments: body.attachments,
          workPreference,
          preliminaryAccepted: Boolean(body.preliminaryAccepted),
          aiEstimateSnapshot,
          estimateClarifications: body.estimateClarifications?.trim() || null,
        });

    return NextResponse.json({
      ok: true,
      referenceNumber: record.referenceNumber,
      trackingToken: record.trackingToken,
      serviceId: record.serviceId,
      preliminaryAccepted: Boolean(record.preliminaryAcceptedAt),
      message: record.preliminaryAcceptedAt
        ? "Zgłoszenie wysłane. Przyjęliśmy wstępną akceptację orientacyjnej wyceny — przygotujemy szczegółową ofertę."
        : "Zgłoszenie zostało wysłane. Skontaktujemy się wkrótce.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia." },
      { status: 400 },
    );
  }
}
