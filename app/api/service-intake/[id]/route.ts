import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  SERVICE_INTAKE_STATUSES,
  type ServiceIntakeStatus,
} from "@/lib/service-intake/types";
import {
  assertServiceIntakeStatusChangeAllowed,
  canManageServiceIntakeBoard,
} from "@/lib/service-intake/status-permissions";
import {
  addServiceIntakeTeamComment,
  getServiceIntakeThreadById,
  updateServiceIntake,
} from "@/lib/supabase/service-intake-server";

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
    };

    const canManage = canManageServiceIntakeBoard(profile.role);

    const patch: {
      status?: ServiceIntakeStatus;
      dueAt?: string | null;
      assigneeId?: string | null;
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
        // Instalator może tylko auto-przypisać siebie przy Przyjmij.
        const selfAssignOnAccept =
          body.status === "in_review" && body.assigneeId === profile.id;
        if (!selfAssignOnAccept) {
          throw new HttpError(403, "Brak uprawnień do zmiany osoby obsługującej.");
        }
      }
      patch.assigneeId = body.assigneeId === "" ? null : body.assigneeId;
    }

    if (
      patch.status === undefined &&
      patch.dueAt === undefined &&
      patch.assigneeId === undefined
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
