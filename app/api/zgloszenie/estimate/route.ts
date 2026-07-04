import { NextResponse } from "next/server";
import {
  intakeRequestTypeRequiresAiEstimate,
  resolveIntakeAiServiceType,
  shouldApplyIntakePrioritySurcharge,
} from "@/lib/service-intake/ai-estimate-flow";
import { computeIntakeAiEstimate } from "@/lib/service-intake/intake-ai-estimate";
import {
  buildGuestServiceClient,
  parseGuestContactAddressBody,
  validateGuestContactAddress,
  formatGuestContactAddress,
} from "@/lib/service-intake/guest-address";
import { readIntakeAuthToken } from "@/lib/service-intake/tokens";
import {
  isGuestIntakeRequestType,
  SERVICE_INTAKE_POST_WARRANTY_ACTIONS,
  SERVICE_INTAKE_PRIORITIES,
  SERVICE_INTAKE_REQUEST_TYPES,
  type ServiceIntakePostWarrantyAction,
  type ServiceIntakePriority,
  type ServiceIntakeRequestType,
} from "@/lib/service-intake/types";
import { rowToClient } from "@/lib/supabase/client-mappers";
import { fetchCompanyProfileServer } from "@/lib/supabase/company-profile-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeServiceGlobalSettings } from "@/lib/supabase/service-mappers";
import { rowToProject } from "@/lib/supabase/mappers";
import { getWarrantyStatus, resolveServiceAiWarrantyContext } from "@/lib/project/warranty";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      verificationToken?: string;
      projectId?: string;
      description?: string;
      requestType?: ServiceIntakeRequestType;
      priority?: ServiceIntakePriority | null;
      postWarrantyAction?: ServiceIntakePostWarrantyAction | null;
      contactPhone?: string;
      contactAddress?: {
        addressStreet?: string;
        addressCity?: string;
        addressPostalCode?: string;
      };
      estimateClarifications?: string;
      isNewContact?: boolean;
    };

    const auth = readIntakeAuthToken(body.verificationToken?.trim() ?? "");
    if (!auth) {
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

    const requestTypeRaw = body.requestType ?? "offer_request";
    const requestType = SERVICE_INTAKE_REQUEST_TYPES.includes(requestTypeRaw)
      ? requestTypeRaw
      : "offer_request";

    const supabase = getSupabaseAdmin();
    const companyProfile = await fetchCompanyProfileServer();
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("data")
      .eq("id", "service_global_settings")
      .maybeSingle();
    const settings = normalizeServiceGlobalSettings(settingsRow?.data ?? {});

    if (auth.kind === "guest") {
      if (!isGuestIntakeRequestType(requestType)) {
        return NextResponse.json(
          { error: "Gość może poprosić tylko o ofertę lub nową funkcjonalność." },
          { status: 400 },
        );
      }

      const contactAddress = parseGuestContactAddressBody(body.contactAddress);
      const addressError = contactAddress ? validateGuestContactAddress(contactAddress) : "Podaj pełny adres obiektu.";
      if (!contactAddress || addressError) {
        return NextResponse.json(
          { error: addressError ?? "Podaj pełny adres obiektu." },
          { status: 400 },
        );
      }

      const formattedAddress = formatGuestContactAddress(contactAddress);
      const client = buildGuestServiceClient({
        fullName: auth.fullName,
        email: auth.email,
        phone: body.contactPhone?.trim() ?? "",
        address: contactAddress,
      });

      const serviceType = resolveIntakeAiServiceType({
        requestType,
        isWarrantyActive: false,
      });

      const result = await computeIntakeAiEstimate({
        description,
        serviceType,
        client,
        projectId: "",
        projectName: formattedAddress,
        warrantyContext: null,
        companyAddress: companyProfile.address,
        rates: settings.rates,
        zoneSettings: settings.zoneSettings,
        discounts: settings.defaultDiscounts,
        postWarrantyAction: null,
        isNewContact: true,
        estimateClarifications: body.estimateClarifications?.trim() || null,
        aiEstimateSettings: settings.aiEstimateSettings,
      });

      return NextResponse.json({
        ok: true,
        estimate: result.public,
        serviceType,
        requestType,
        snapshot: {
          public: result.public,
          record: result.record,
          serviceType,
          requestType,
          prioritySurchargeApplied: result.public.prioritySurchargeApplied,
          prioritySurchargePercent: result.public.prioritySurchargePercent,
        },
      });
    }

    const projectId = body.projectId?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "Wybierz obiekt." }, { status: 400 });
    }

    const [{ data: clientRow }, { data: projectRow }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", auth.clientId).maybeSingle(),
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    ]);

    if (!clientRow) {
      return NextResponse.json({ error: "Nie znaleziono klienta." }, { status: 400 });
    }
    if (!projectRow || projectRow.client_id !== auth.clientId) {
      return NextResponse.json({ error: "Wybrany obiekt nie należy do Twojego konta." }, { status: 400 });
    }

    const client = rowToClient(clientRow);
    const project = rowToProject(projectRow);
    const warranty = getWarrantyStatus(project);
    const isWarrantyActive = warranty.status === "active" || warranty.status === "expiring_soon";
    const isServiceRequest = requestType === "service";

    if (
      !intakeRequestTypeRequiresAiEstimate({
        requestType,
        isWarrantyActive,
        isServiceRequest,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "Orientacyjna wycena AI nie dotyczy zgłoszeń serwisowych objętych aktywną gwarancją.",
        },
        { status: 400 },
      );
    }

    const serviceType = resolveIntakeAiServiceType({ requestType, isWarrantyActive });

    const warrantyContext = await resolveServiceAiWarrantyContext({
      project,
      projectId,
      serviceType,
    });

    const priorityRaw = body.priority ?? null;
    const priority =
      priorityRaw && SERVICE_INTAKE_PRIORITIES.includes(priorityRaw) ? priorityRaw : null;

    const postWarrantyActionRaw = body.postWarrantyAction ?? null;
    const postWarrantyAction =
      postWarrantyActionRaw &&
      SERVICE_INTAKE_POST_WARRANTY_ACTIONS.includes(postWarrantyActionRaw)
        ? postWarrantyActionRaw
        : null;

    const applyPrioritySurcharge = shouldApplyIntakePrioritySurcharge({
      requestType,
      isWarrantyActive,
      priority,
    });

    const result = await computeIntakeAiEstimate({
      description,
      serviceType,
      client,
      projectId,
      projectName: project.name,
      warrantyContext,
      companyAddress: companyProfile.address,
      rates: settings.rates,
      zoneSettings: settings.zoneSettings,
      discounts: settings.defaultDiscounts,
      prioritySurchargePercent: settings.intakeSettings.prioritySurchargePercent,
      applyPrioritySurcharge,
      postWarrantyAction: isServiceRequest && !isWarrantyActive ? postWarrantyAction : null,
      aiEstimateSettings: settings.aiEstimateSettings,
      estimateClarifications: body.estimateClarifications?.trim() || null,
    });

    return NextResponse.json({
      ok: true,
      estimate: result.public,
      serviceType,
      requestType,
      snapshot: {
        public: result.public,
        record: result.record,
        serviceType,
        requestType,
        prioritySurchargeApplied: result.public.prioritySurchargeApplied,
        prioritySurchargePercent: result.public.prioritySurchargePercent,
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
