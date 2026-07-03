import { NextResponse } from "next/server";
import {
  fetchServiceByClientOfferToken,
  getPublicOfferView,
  isPublicOfferAvailable,
  isPublicOfferQuestionAvailable,
  respondToClientOffer,
} from "@/lib/supabase/client-offer-repository";
import { isOfferExpired } from "@/lib/service/offer-validity";
import {
  CLIENT_OFFER_ACTION_LABELS,
  CLIENT_OFFER_STATUS_LABELS,
  type ClientOfferAction,
} from "@/lib/service/client-offer";

const ACTIONS = Object.keys(CLIENT_OFFER_ACTION_LABELS) as ClientOfferAction[];

function parseAction(value: unknown): ClientOfferAction | null {
  return typeof value === "string" && ACTIONS.includes(value as ClientOfferAction)
    ? (value as ClientOfferAction)
    : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const service = await fetchServiceByClientOfferToken(token);
    if (!service) {
      return NextResponse.json({ error: "Nie znaleziono oferty." }, { status: 404 });
    }

    const offer = service.clientOffer;
    const canRespond = isPublicOfferAvailable(service);
    const canAskQuestion = isPublicOfferQuestionAvailable(service);
    const expired = isOfferExpired(offer.expiresAt);

    return NextResponse.json({
      service: getPublicOfferView(service),
      offer: {
        status: offer.status,
        statusLabel: offer.status ? CLIENT_OFFER_STATUS_LABELS[offer.status] : null,
        message: offer.message,
        respondedAt: offer.respondedAt,
        expiresAt: offer.expiresAt,
        canRespond,
        canAskQuestion,
        isExpired: expired,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się pobrać oferty." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = parseAction(data.action);
  const message = typeof data.message === "string" ? data.message : undefined;
  const selectedOptionalItemIds = Array.isArray(data.selectedOptionalItemIds)
    ? data.selectedOptionalItemIds.filter((id): id is string => typeof id === "string")
    : undefined;

  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const service = await respondToClientOffer(token, action, message, selectedOptionalItemIds);
    const offer = service.clientOffer;

    return NextResponse.json({
      ok: true,
      offer: {
        status: offer.status,
        statusLabel: offer.status ? CLIENT_OFFER_STATUS_LABELS[offer.status] : null,
        message: offer.message,
        respondedAt: offer.respondedAt,
      },
      serviceStatus: service.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać decyzji." },
      { status: 400 },
    );
  }
}
