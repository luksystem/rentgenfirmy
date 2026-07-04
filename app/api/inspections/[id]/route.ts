import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { createInspectionBillingNotification } from "@/lib/notifications/inspection-billing";
import {
  assertInspectionStatus,
  deleteInspection,
  getInspectionById,
  updateInspection,
  updateInspectionWithAssignee,
} from "@/lib/supabase/inspection-server";
import { INSPECTION_STATUSES } from "@/lib/inspections/types";

function statusRequiresProtocolSignatures(status?: string) {
  return status === "completed" || status === "billing";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const item = await getInspectionById(id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono przeglądu." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: string;
      preliminaryDate?: string | null;
      confirmedDate?: string | null;
      assigneeId?: string | null;
      protocolData?: Record<string, unknown>;
      protocolCompanySignedAt?: string | null;
      protocolClientSignedAt?: string | null;
      protocolCompanySigner?: string | null;
      protocolClientSigner?: string | null;
    };

    if (body.status && !assertInspectionStatus(body.status)) {
      return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
    }

    if (body.status === "planned" && !body.confirmedDate) {
      return NextResponse.json(
        { error: "Ustaw konkretną datę przed przeniesieniem do Zaplanowane." },
        { status: 400 },
      );
    }

    if (statusRequiresProtocolSignatures(body.status)) {
      const current = await getInspectionById(id);
      if (!current?.protocolCompanySignedAt || !current?.protocolClientSignedAt) {
        if (!body.protocolCompanySignedAt || !body.protocolClientSignedAt) {
          return NextResponse.json(
            { error: "Protokół musi być podpisany przez obie strony." },
            { status: 400 },
          );
        }
      }
    }

    const now = new Date().toISOString();
    let item = await updateInspectionWithAssignee(id, {
      status: body.status as (typeof INSPECTION_STATUSES)[number] | undefined,
      preliminaryDate: body.preliminaryDate,
      confirmedDate: body.confirmedDate,
      assigneeId: body.assigneeId,
      protocolData: body.protocolData,
      protocolCompanySignedAt: body.protocolCompanySignedAt,
      protocolClientSignedAt: body.protocolClientSignedAt,
      protocolCompanySigner: body.protocolCompanySigner,
      protocolClientSigner: body.protocolClientSigner,
      completedAt: statusRequiresProtocolSignatures(body.status) ? now : undefined,
      billingSettledAt: body.status === "settled" ? now : undefined,
    });

    if (body.status === "billing" && !item.billingNotificationSentAt) {
      await createInspectionBillingNotification({
        inspectionId: item.id,
        clientName: item.clientName ?? "Klient",
        systemLabel: item.systemLabel,
        confirmedDate: item.confirmedDate,
      });
      item = await updateInspection(id, { billingNotificationSentAt: now });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zaktualizować." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteInspection(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się usunąć przeglądu." },
      { status: 400 },
    );
  }
}
