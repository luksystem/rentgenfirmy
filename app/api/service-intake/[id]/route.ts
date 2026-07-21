import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  SERVICE_INTAKE_RESOLUTION_OUTCOMES,
  SERVICE_INTAKE_STATUSES,
  type ServiceIntakeResolutionOutcome,
  type ServiceIntakeSettlementFeedback,
  type ServiceIntakeStatus,
  type ServiceIntakeStuckFeedback,
} from "@/lib/service-intake/types";
import {
  assertServiceIntakeStatusChangeAllowed,
  canDeleteServiceIntake,
  canManageServiceIntakeBoard,
} from "@/lib/service-intake/status-permissions";
import {
  addServiceIntakeTeamComment,
  deleteServiceIntake,
  getServiceIntakeThreadById,
  updateServiceIntake,
} from "@/lib/supabase/service-intake-server";

function parseSettlement(value: unknown): ServiceIntakeSettlementFeedback | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const resolutionOutcome = raw.resolutionOutcome;
  if (
    typeof resolutionOutcome !== "string" ||
    !SERVICE_INTAKE_RESOLUTION_OUTCOMES.includes(resolutionOutcome as ServiceIntakeResolutionOutcome)
  ) {
    throw new HttpError(400, "Nieprawidłowy wynik rozwiązania.");
  }
  return {
    resolutionOutcome: resolutionOutcome as ServiceIntakeResolutionOutcome,
    resolutionCause: typeof raw.resolutionCause === "string" ? raw.resolutionCause : "",
    extraCosts: Boolean(raw.extraCosts),
    extraCostsNote: typeof raw.extraCostsNote === "string" ? raw.extraCostsNote : "",
  };
}

function parseStuck(value: unknown): ServiceIntakeStuckFeedback | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  return {
    stuckReason: typeof raw.stuckReason === "string" ? raw.stuckReason : "",
    stuckNotes: typeof raw.stuckNotes === "string" ? raw.stuckNotes : "",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { id } = await context.params;
    const thread = await getServiceIntakeThreadById(id);
    if (!thread) {
      return NextResponse.json({ error: "Nie znaleziono zgłoszenia." }, { status: 404 });
    }
    return NextResponse.json(thread);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: ServiceIntakeStatus;
      dueAt?: string | null;
      assigneeId?: string | null;
      involvedProfileIds?: string[];
      settlement?: unknown;
      stuck?: unknown;
    };

    const canManage = canManageServiceIntakeBoard(profile.role);

    const patch: {
      status?: ServiceIntakeStatus;
      dueAt?: string | null;
      assigneeId?: string | null;
      involvedProfileIds?: string[];
      settlement?: ServiceIntakeSettlementFeedback;
      stuck?: ServiceIntakeStuckFeedback;
    } = {};

    if (body.status !== undefined) {
      if (!SERVICE_INTAKE_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
      }
      patch.status = body.status;
    }

    if (body.dueAt !== undefined) {
      if (!canManage) {
        throw new HttpError(403, "Brak uprawnień do zmiany terminu.");
      }
      if (body.dueAt === null || body.dueAt === "") {
        patch.dueAt = null;
      } else {
        const parsed = new Date(body.dueAt);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "Nieprawidłowa data wykonania." }, { status: 400 });
        }
        patch.dueAt = parsed.toISOString();
      }
    }

    if (body.assigneeId !== undefined) {
      if (!canManage) {
        // Instalator może tylko auto-przypisać siebie przy Przyjmij / Wznów.
        const selfAssignOnAccept =
          body.status === "in_review" && body.assigneeId === profile.id;
        if (!selfAssignOnAccept) {
          throw new HttpError(403, "Brak uprawnień do zmiany osoby obsługującej.");
        }
      }
      patch.assigneeId = body.assigneeId === "" ? null : body.assigneeId;
    }

    if (body.involvedProfileIds !== undefined) {
      if (!Array.isArray(body.involvedProfileIds)) {
        return NextResponse.json({ error: "Nieprawidłowa lista zaangażowanych." }, { status: 400 });
      }
      patch.involvedProfileIds = body.involvedProfileIds.map(String);
    }

    if (body.settlement !== undefined) {
      patch.settlement = parseSettlement(body.settlement);
    }

    if (body.stuck !== undefined) {
      patch.stuck = parseStuck(body.stuck);
    }

    if (
      patch.status === undefined &&
      patch.dueAt === undefined &&
      patch.assigneeId === undefined &&
      patch.involvedProfileIds === undefined &&
      patch.settlement === undefined &&
      patch.stuck === undefined
    ) {
      return NextResponse.json({ error: "Brak pól do aktualizacji." }, { status: 400 });
    }

    if (patch.status !== undefined) {
      const thread = await getServiceIntakeThreadById(id);
      if (!thread) {
        return NextResponse.json({ error: "Nie znaleziono zgłoszenia." }, { status: 404 });
      }
      assertServiceIntakeStatusChangeAllowed({
        role: profile.role,
        from: thread.intake.status,
        to: patch.status,
      });
    }

    const item = await updateServiceIntake(id, patch);
    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as { message?: string; authorName?: string };
    const comment = await addServiceIntakeTeamComment({
      intakeId: id,
      authorName: body.authorName?.trim() || getUserDisplayName(profile),
      body: body.message ?? "",
    });
    return NextResponse.json({ comment });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!canDeleteServiceIntake(profile.role)) {
      throw new HttpError(403, "Tylko administrator może usunąć zgłoszenie.");
    }
    const { id } = await context.params;
    await deleteServiceIntake(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
