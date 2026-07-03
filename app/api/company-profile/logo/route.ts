import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  removeCompanyLogoServer,
  uploadCompanyLogoServer,
} from "@/lib/supabase/company-profile-server";

export async function POST(request: Request) {
  try {
    await requireAdministratorProfile();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku logo." }, { status: 400 });
    }

    const profile = await uploadCompanyLogoServer(file);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  try {
    await requireAdministratorProfile();
    const profile = await removeCompanyLogoServer();
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
