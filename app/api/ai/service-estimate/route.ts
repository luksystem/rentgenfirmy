import { NextResponse } from "next/server";
import { generateServiceAiEstimate } from "@/lib/ai/service-estimate-generator";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { fetchCompanyProfileServer } from "@/lib/supabase/company-profile-server";
import { rowToClient } from "@/lib/supabase/client-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToService } from "@/lib/supabase/service-mappers";
import { aggregateAiTaskHours } from "@/lib/service/apply-ai-estimate";
import { buildReferenceCasesFromServices } from "@/lib/service/ai-reference-cases";
import { buildLineItemsFromAiEstimate } from "@/lib/service/apply-ai-estimate";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { buildServiceTravelContext } from "@/lib/service/travel-context";
import {
  fetchProjectAiContext,
  formatProjectAiContextForPrompt,
} from "@/lib/service/project-ai-context";
import { resolveServiceAiWarrantyContext } from "@/lib/project/warranty";
import { rowToProject } from "@/lib/supabase/mappers";
import { normalizeServiceGlobalSettings } from "@/lib/supabase/service-mappers";
import { SERVICE_TYPES, type ServiceType } from "@/lib/service/types";

const SERVICE_SETTINGS_ID = "service_global_settings";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const serviceTypeRaw = typeof data.serviceType === "string" ? data.serviceType : "Pogwarancyjny";
  const serviceType = SERVICE_TYPES.includes(serviceTypeRaw as ServiceType)
    ? (serviceTypeRaw as ServiceType)
    : "Pogwarancyjny";
  const clientId = typeof data.clientId === "string" ? data.clientId : null;
  const projectId = typeof data.projectId === "string" ? data.projectId.trim() : "";
  const clientLocation =
    typeof data.clientLocation === "string" ? data.clientLocation.trim() : "";

  if (!description) {
    return NextResponse.json({ error: "Wpisz opis prac do oszacowania." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const companyProfile = await fetchCompanyProfileServer();

    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("data")
      .eq("id", SERVICE_SETTINGS_ID)
      .maybeSingle();

    const settings = normalizeServiceGlobalSettings(settingsRow?.data ?? {});

    let client = null;
    if (clientId) {
      const { data: clientRow, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (clientError) {
        throw new Error(clientError.message);
      }

      if (clientRow) {
        client = rowToClient(clientRow);
      }
    }

    const { data: settledRows } = await supabase
      .from("services")
      .select("*")
      .eq("status", "Rozliczony")
      .order("updated_at", { ascending: false })
      .limit(15);

    const referenceCases = buildReferenceCasesFromServices(
      (settledRows ?? []).map(rowToService),
    );

    const projectContextData = projectId
      ? await fetchProjectAiContext({ projectId })
      : null;
    const projectContext = projectContextData
      ? formatProjectAiContextForPrompt(projectContextData)
      : null;

    let warrantyContext = null;
    if (projectId) {
      const { data: projectRow } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectRow) {
        warrantyContext = await resolveServiceAiWarrantyContext({
          project: rowToProject(projectRow),
          projectId,
          serviceType,
        });
      }
    }

    const proposal = await generateServiceAiEstimate({
      description,
      serviceType,
      clientLocation: client?.location ?? clientLocation,
      companyAddress: companyProfile.address,
      oneWayDistanceKm: null,
      referenceCases,
      projectContext,
      warrantyContext,
      promptSettings: settings.aiEstimateSettings,
    });

    const hours = aggregateAiTaskHours(proposal.recognizedTasks);
    const totalOnsiteHours =
      hours.installerHours +
      hours.helperHours +
      hours.programmerOnsiteHours +
      hours.supervisorHours;

    const travelContext = await buildServiceTravelContext({
      companyAddress: companyProfile.address,
      client,
      clientLocationFallback: clientLocation,
      zoneSettings: settings.zoneSettings,
      aiTravel: proposal.travel,
      totalOnsiteHours,
    });

    proposal.travel = {
      ...proposal.travel,
      oneWayDistanceKm: travelContext.oneWayDistanceKm,
      totalDistanceKm: travelContext.totalDistanceKm,
      estimatedDriveTimeHours: travelContext.estimatedDriveTimeHours,
      overnights: travelContext.resolvedOvernights,
      overnightRequired: travelContext.resolvedOvernights > 0,
      estimatedTrips: travelContext.resolvedTrips,
    };

    const lineItemsPreview = buildLineItemsFromAiEstimate({
      proposal,
      travelContext,
    });

    const costBreakdown = calculateServiceCost(
      lineItemsPreview,
      settings.rates,
      settings.zoneSettings,
      settings.defaultDiscounts,
    );

    return NextResponse.json({
      proposal,
      travelContext,
      lineItemsPreview,
      costBreakdown,
      referenceCasesUsed: referenceCases.length,
      projectContextUsed: Boolean(projectContext),
      warrantyContextUsed: Boolean(warrantyContext),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się wygenerować szacunku AI.",
      },
      { status: 500 },
    );
  }
}
