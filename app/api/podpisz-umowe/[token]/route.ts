import { NextResponse } from "next/server";
import { CONTRACT_STATUS_LABELS, canRespondToContract } from "@/lib/contracts/types";
import { isContractExpired } from "@/lib/contracts/normalize";
import { fetchContractByPublicToken, respondToContract, type RespondToContractAction } from "@/lib/supabase/contract-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, must-revalidate" };

function parseAction(value: unknown): RespondToContractAction | null {
  return value === "sign" || value === "reject" ? value : null;
}

function resolveClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  try {
    const contract = await fetchContractByPublicToken(token);
    if (!contract) {
      return NextResponse.json({ error: "Nie znaleziono umowy." }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      {
        contract,
        statusLabel: CONTRACT_STATUS_LABELS[contract.status],
        isExpired: isContractExpired(contract),
        canRespond: canRespondToContract(contract),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się pobrać umowy." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = parseAction(data.action);
  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const signerName = typeof data.signerName === "string" ? data.signerName : undefined;
  const selectedOptionSectionIds = Array.isArray(data.selectedOptionSectionIds)
    ? data.selectedOptionSectionIds.filter((id): id is string => typeof id === "string")
    : undefined;
  const selectedPaymentPlanId = typeof data.selectedPaymentPlanId === "string" ? data.selectedPaymentPlanId : null;

  try {
    const contract = await respondToContract(token, action, {
      signerName,
      selectedOptionSectionIds,
      selectedPaymentPlanId,
      ip: resolveClientIp(request),
    });

    return NextResponse.json({
      ok: true,
      contract,
      statusLabel: CONTRACT_STATUS_LABELS[contract.status],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać decyzji." },
      { status: 400 },
    );
  }
}
