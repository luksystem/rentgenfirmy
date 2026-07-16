import { isHighCafePriority } from "@/lib/service-intake/cafe-priorities";
import type { ServiceIntakePriority, ServiceIntakeRequestType } from "@/lib/service-intake/types";
import type { ServiceType } from "@/lib/service/types";

export function resolveIntakeAiServiceType(input: {
  requestType: ServiceIntakeRequestType;
  isWarrantyActive: boolean;
}): ServiceType {
  if (input.requestType === "new_feature" || input.requestType === "offer_request") {
    return "Prace dodatkowe";
  }

  return input.isWarrantyActive ? "Gwarancyjny" : "Pogwarancyjny";
}

export function intakeRequestTypeRequiresAiEstimate(input: {
  requestType: ServiceIntakeRequestType;
  isWarrantyActive: boolean;
  isServiceRequest: boolean;
}): boolean {
  if (input.requestType === "offer_request" || input.requestType === "new_feature") {
    return true;
  }

  return input.isServiceRequest && !input.isWarrantyActive;
}

export function intakeAllowsPreliminaryAcceptance(input: {
  requestType: ServiceIntakeRequestType;
  postWarrantyAction: "offer" | "on_site" | "remote" | null;
}): boolean {
  if (input.requestType === "offer_request" || input.requestType === "new_feature") {
    return true;
  }

  return (
    input.postWarrantyAction === "offer" ||
    input.postWarrantyAction === "on_site" ||
    input.postWarrantyAction === "remote"
  );
}

/** Czy typ zgłoszenia trafia do Szybkich ofert (nie na tablicę serwisową). */
export function isCommercialIntakeRequestType(requestType: ServiceIntakeRequestType) {
  return requestType === "offer_request" || requestType === "new_feature";
}

/**
 * Wymagana akceptacja wyceny na kroku wyceny:
 * - gość / nowa funkcja / prośba o ofertę → zawsze (trafia do Szybkich ofert),
 * - serwis: przyjazd lub serwis zdalny.
 */
export function intakeRequiresPreliminaryAcceptance(input: {
  requestType: ServiceIntakeRequestType;
  postWarrantyAction: "offer" | "on_site" | "remote" | null;
  isGuest?: boolean;
}): boolean {
  if (input.isGuest || isCommercialIntakeRequestType(input.requestType)) {
    return true;
  }

  return (
    input.requestType === "service" &&
    (input.postWarrantyAction === "on_site" || input.postWarrantyAction === "remote")
  );
}

export type IntakeEstimateScope = "full" | "remote_only";

export function resolveIntakeEstimateScope(
  postWarrantyAction: "offer" | "on_site" | "remote" | null,
): IntakeEstimateScope {
  return postWarrantyAction === "remote" ? "remote_only" : "full";
}

/** Dopłata % do stawek — tylko serwis pogwarancyjny z priorytetem CAFE C lub A. */
export function shouldApplyIntakePrioritySurcharge(input: {
  requestType: ServiceIntakeRequestType;
  isWarrantyActive: boolean;
  priority: ServiceIntakePriority | null;
}): boolean {
  return (
    input.requestType === "service" &&
    !input.isWarrantyActive &&
    input.priority !== null &&
    isHighCafePriority(input.priority)
  );
}
