import { NextResponse } from "next/server";
import { computeIntakeAiEstimate } from "@/lib/service-intake/intake-ai-estimate";
import { readIntakeVerifiedToken } from "@/lib/service-intake/tokens";
import { SERVICE_TYPES, type ServiceType } from "@/lib/service/types";
import { rowToClient } from "@/lib/supabase/client-mappers";
import { fetchCompanyProfileServer } from "@/lib/supabase/company-profile-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeServiceGlobalSettings } from "@/lib/supabase/service-mappers";
import { rowToProject } from "@/lib/supabase/mappers";
import { getWarrantyStatus } from "@/lib/project/warranty";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      verificationToken?: string;
      projectId?: string;
      description?: string;
      serviceTypeHint?: ServiceType;
    };

    const verified = readIntakeVerifiedToken(body.verificationToken?.trim() ?? "");
    if (!verified) {
      return NextResponse.json(
        { error: "Sesja wygasła. Odśwież stronę i zacznij od początku." },
        { status: 401 },
      );
    }

    const description = body.description?.trim() ?? "";
    if (description.length < 10) {
      return NextResponse.json(
        { error: "Opisz zgłoszenie (minimum 10 znaków)." },
        { status: 400 },
      );
    }

    const projectId = body.projectId?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "Wybierz obiekt." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const [{ data: clientRow }, { data: projectRow }, companyProfile, { data: settingsRow }] =
      await Promise.all([
        supabase.from("clients").select("*").eq("id", verified.clientId).maybeSingle(),
        supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
        fetchCompanyProfileServer(),
        supabase.from("app_settings").select("data").eq("id", "service_global_settings").maybeSingle(),
      ]);

    if (!clientRow) {
      return NextResponse.json({ error: "Nie znaleziono klienta." }, { status: 400 });
    }
    if (!projectRow || projectRow.client_id !== verified.clientId) {
      return NextResponse.json({ error: "Wybrany obiekt nie należy do Twojego konta." }, { status: 400 });
    }

    const client = rowToClient(clientRow);
    const project = rowToProject(projectRow);
    const warranty = getWarrantyStatus(project);
    const isWarrantyActive = warranty.status === "active" || warranty.status === "expiring_soon";
    const defaultServiceType = isWarrantyActive ? "Gwarancyjny" : "Pogwarancyjny";

    const serviceTypeRaw = body.serviceTypeHint ?? defaultServiceType;
    const serviceType = SERVICE_TYPES.includes(serviceTypeRaw) ? serviceTypeRaw : defaultServiceType;

    const settings = normalizeServiceGlobalSettings(settingsRow?.data ?? {});

    const result = await computeIntakeAiEstimate({
      description,
      serviceType,
      client,
      projectName: project.name,
      companyAddress: companyProfile.address,
      rates: settings.rates,
      zoneSettings: settings.zoneSettings,
      discounts: settings.defaultDiscounts,
    });

    return NextResponse.json({
      ok: true,
      estimate: result.public,
      serviceType,
      snapshot: {
        public: result.public,
        record: result.record,
        serviceType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się oszacować kosztów.",
      },
      { status: 500 },
    );
  }
}
