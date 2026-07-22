import { NextResponse } from "next/server";
import { userActivityHref } from "@/lib/activity-log/hrefs";
import type { UserProfileInput } from "@/lib/auth/types";
import { getUserDisplayName, USER_ROLES } from "@/lib/auth/types";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { logActivityAdmin } from "@/lib/supabase/activity-log-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileInputToUpdate, mapProfileRow } from "@/lib/supabase/profile-mappers";

function parseUserInput(body: unknown): UserProfileInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const data = body as Record<string, unknown>;
  const role = typeof data.role === "string" ? data.role : "instalator";

  if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
    return null;
  }

  if (typeof data.email !== "string" || !data.email.trim()) {
    return null;
  }

  return {
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    email: data.email,
    role: role as UserProfileInput["role"],
    isActive: data.isActive !== false,
    dailyHoursLimit: typeof data.dailyHoursLimit === "number" ? data.dailyHoursLimit : null,
    weeklyHoursLimit: typeof data.weeklyHoursLimit === "number" ? data.weeklyHoursLimit : null,
    baseLocation: typeof data.baseLocation === "string" ? data.baseLocation : "",
    costRate: typeof data.costRate === "number" ? data.costRate : null,
    isAvailableForPlanning: data.isAvailableForPlanning !== false,
    supervisorId: typeof data.supervisorId === "string" && data.supervisorId.trim() ? data.supervisorId : null,
    monthlyReviewEnabled:
      typeof data.monthlyReviewEnabled === "boolean" ? data.monthlyReviewEnabled : role !== "administrator",
  };
}

/** Przełożony jest obowiązkowy dla wszystkich ról poza administratorem. */
function validateSupervisor(body: UserProfileInput, ownId?: string) {
  if (body.role === "administrator") {
    return null;
  }
  if (!body.supervisorId) {
    return "Wybierz przełożonego (wymagane dla wszystkich ról poza administratorem).";
  }
  if (ownId && body.supervisorId === ownId) {
    return "Użytkownik nie może być swoim własnym przełożonym.";
  }
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdministratorProfile();
    const { id } = await context.params;
    const body = parseUserInput(await request.json());

    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane użytkownika." }, { status: 400 });
    }

    const supervisorError = validateSupervisor(body, id);
    if (supervisorError) {
      return NextResponse.json({ error: supervisorError }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: profile, error } = await admin
      .from("profiles")
      .update(mapProfileInputToUpdate(body))
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await admin.auth.admin.updateUserById(id, {
      email: body.email.trim(),
      user_metadata: {
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        phone: body.phone.trim(),
        role: body.role,
      },
      ban_duration: body.isActive ? "none" : "876000h",
    });

    const user = mapProfileRow(profile);
    void logActivityAdmin({
      actorUserId: actor.userId,
      actorName: getUserDisplayName(actor.profile),
      action: "updated",
      entityType: "user",
      entityId: user.id,
      entityLabel: getUserDisplayName(user),
      summary: "Zaktualizował użytkownika",
      href: userActivityHref(),
    });

    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdministratorProfile();
    const { id } = await context.params;

    if (id === actor.userId) {
      return NextResponse.json(
        { error: "Nie możesz usunąć własnego konta administratora." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const label = existingProfile
      ? getUserDisplayName(mapProfileRow(existingProfile))
      : id;

    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) {
      throw new Error(error.message);
    }

    void logActivityAdmin({
      actorUserId: actor.userId,
      actorName: getUserDisplayName(actor.profile),
      action: "deleted",
      entityType: "user",
      entityId: id,
      entityLabel: label,
      summary: "Usunął użytkownika",
      href: userActivityHref(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
