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

  return input.postWarrantyAction === "offer";
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
