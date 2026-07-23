import { NextResponse } from "next/server";
import {
  fetchServiceByPublicOfferToken,
  getPublicOfferView,
  getPublicSettlementView,
  isPublicOfferAvailable,
  isPublicOfferQuestionAvailable,
  isPublicSettlementOfferAvailable,
  isPublicSettlementOfferQuestionAvailable,
  respondToClientOffer,
  respondToSettlementOffer,
} from "@/lib/supabase/client-offer-repository";
import { isOfferExpired } from "@/lib/service/offer-validity";
import {
  CLIENT_OFFER_ACTION_LABELS,
  CLIENT_OFFER_STATUS_LABELS,
  type ClientOfferAction,
} from "@/lib/service/client-offer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, must-revalidate" };

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
    const lookup = await fetchServiceByPublicOfferToken(token);
    if (!lookup) {
      return NextResponse.json(
        { error: "Nie znaleziono oferty." },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const { kind, service } = lookup;
    const offer = kind === "settlement" ? service.settlementOffer : service.clientOffer;
    const canRespond =
      kind === "settlement"
        ? isPublicSettlementOfferAvailable(service)
        : isPublicOfferAvailable(service);
    const canAskQuestion =
      kind === "settlement"
        ? isPublicSettlementOfferQuestionAvailable()
        : isPublicOfferQuestionAvailable(service);
    const expired = isOfferExpired(offer.expiresAt);
    const publicService =
      kind === "settlement" ? getPublicSettlementView(service) : getPublicOfferView(service);

    return NextResponse.json(
      {
        kind,
        service: publicService,
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
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się pobrać oferty." },
      { status: 500, headers: NO_STORE_HEADERS },
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
    const lookup = await fetchServiceByPublicOfferToken(token);
    if (!lookup) {
      return NextResponse.json({ error: "Nie znaleziono oferty." }, { status: 404 });
    }

    const service =
      lookup.kind === "settlement"
        ? await respondToSettlementOffer(token, action, message)
        : await respondToClientOffer(token, action, message, selectedOptionalItemIds);

    const offer =
      lookup.kind === "settlement" ? service.settlementOffer : service.clientOffer;

    return NextResponse.json({
      ok: true,
      kind: lookup.kind,
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
