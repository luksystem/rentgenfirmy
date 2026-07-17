import { NextResponse } from "next/server";
import { userActivityHref } from "@/lib/activity-log/hrefs";
import { getUserDisplayName, USER_ROLES, type UserProfileInput } from "@/lib/auth/types";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { ensureEmployeeDashboardSpaceServer } from "@/lib/messages/resolve-message-variables";
import { logActivityAdmin } from "@/lib/supabase/activity-log-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  mapProfileInputToInsert,
  mapProfileRow,
} from "@/lib/supabase/profile-mappers";
import { dispatchSmsRules } from "@/lib/supabase/sms-rules-server";

type CreateUserBody = UserProfileInput & {
  password?: string;
  sendInvite?: boolean;
};

function parseUserInput(body: unknown): CreateUserBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const data = body as Record<string, unknown>;
  const role = typeof data.role === "string" ? data.role : "pracownik";

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
    role: role as CreateUserBody["role"],
    isActive: data.isActive !== false,
    dailyHoursLimit: typeof data.dailyHoursLimit === "number" ? data.dailyHoursLimit : null,
    weeklyHoursLimit: typeof data.weeklyHoursLimit === "number" ? data.weeklyHoursLimit : null,
    baseLocation: typeof data.baseLocation === "string" ? data.baseLocation : "",
    costRate: typeof data.costRate === "number" ? data.costRate : null,
    isAvailableForPlanning: data.isAvailableForPlanning !== false,
    supervisorId: typeof data.supervisorId === "string" && data.supervisorId.trim() ? data.supervisorId : null,
    password: typeof data.password === "string" ? data.password : undefined,
    sendInvite: data.sendInvite === true,
  };
}

/** Przełożony jest obowiązkowy dla wszystkich ról poza administratorem. */
function validateSupervisor(body: CreateUserBody, ownId?: string) {
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

export async function GET() {
  try {
    await requireAdministratorProfile();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      users: (data ?? []).map(mapProfileRow),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdministratorProfile();
    const body = parseUserInput(await request.json());

    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane użytkownika." }, { status: 400 });
    }

    const supervisorError = validateSupervisor(body);
    if (supervisorError) {
      return NextResponse.json({ error: supervisorError }, { status: 400 });
    }

    if (!body.sendInvite && (!body.password || body.password.length < 8)) {
      return NextResponse.json(
        { error: "Podaj hasło (min. 8 znaków) lub wybierz wysyłkę zaproszenia." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const metadata = {
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      phone: body.phone.trim(),
      role: body.role,
    };

    let userId: string;

    if (body.sendInvite) {
      const origin = new URL(request.url).origin;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(body.email.trim(), {
        data: metadata,
        redirectTo: `${origin}/auth/callback?next=/konto/haslo`,
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Nie udało się wysłać zaproszenia.");
      }

      userId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email.trim(),
        password: body.password!,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Nie udało się utworzyć użytkownika.");
      }

      userId = data.user.id;
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert(mapProfileInputToInsert(userId, body), { onConflict: "id" })
      .select("*")
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const user = mapProfileRow(profile);

    await ensureEmployeeDashboardSpaceServer(admin, {
      profileId: user.id,
      displayName: getUserDisplayName(user),
    }).catch(() => undefined);

    void dispatchSmsRules("user_created", {
      userId: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }).catch(() => undefined);

    void logActivityAdmin({
      actorUserId: actor.userId,
      actorName: getUserDisplayName(actor.profile),
      action: "created",
      entityType: "user",
      entityId: user.id,
      entityLabel: getUserDisplayName(user),
      summary: "Dodał użytkownika",
      href: userActivityHref(),
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
