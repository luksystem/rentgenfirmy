import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import {
  normalizeRoleNavPermissionsConfig,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";
import { fetchRoleNavPermissionsConfigServer } from "@/lib/navigation/role-nav-permissions-server";
import { saveRoleNavPermissionsConfig } from "@/lib/supabase/role-nav-permissions-repository";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const config = await fetchRoleNavPermissionsConfigServer();
    return NextResponse.json({ config });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : "Błąd pobierania uprawnień.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = (await request.json()) as { config?: RoleNavPermissionsConfig };
    const config = normalizeRoleNavPermissionsConfig(body.config);
    const saved = await saveRoleNavPermissionsConfig(config);
    return NextResponse.json({ config: saved });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : "Błąd zapisu uprawnień.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
