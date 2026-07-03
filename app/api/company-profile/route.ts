import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeCompanyProfile } from "@/lib/company/company-profile";
import { resolveCompanyProfileDocument } from "@/lib/company/company-profile-document";
import {
  fetchCompanyProfileServer,
  saveCompanyProfileServer,
} from "@/lib/supabase/company-profile-server";

export async function GET() {
  try {
    const profile = await fetchCompanyProfileServer();
    return NextResponse.json({ profile: resolveCompanyProfileDocument(profile) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();

    const body = await request.json();
    const raw =
      body && typeof body === "object" && "profile" in body
        ? (body as { profile: unknown }).profile
        : body;

    const saved = await saveCompanyProfileServer(normalizeCompanyProfile(raw));
    return NextResponse.json({ profile: resolveCompanyProfileDocument(saved) });
  } catch (error) {
    return jsonError(error);
  }
}
