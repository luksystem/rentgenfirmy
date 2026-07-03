import { hasBillableLineItem } from "@/lib/service/calculate-service-cost";
import type { ServiceRecord } from "@/lib/service/types";

export function validateService(service: ServiceRecord): string[] {
  const errors: string[] = [];

  if (!service.title.trim()) {
    errors.push("Tytuł serwisu jest wymagany.");
  }

  if (!service.serviceType) {
    errors.push("Typ serwisu jest wymagany.");
  }

  if (!service.client.fullName.trim()) {
    errors.push("Imię i nazwisko klienta jest wymagane.");
  }

  if (!service.client.location.trim()) {
    errors.push("Obiekt / lokalizacja jest wymagana.");
  }

  if (!service.client.email.trim() && !service.client.phone.trim()) {
    errors.push("Podaj e-mail lub telefon klienta.");
  }

  if (!hasBillableLineItem(service.estimate) && !hasBillableLineItem(service.actual)) {
    const hasOptional = service.optionalItems.some(
      (item) => item.title.trim() && item.netAmount > 0,
    );
    if (!hasOptional) {
      errors.push(
        "W przewidywanych kosztach lub kosztach rzeczywistych musi być przynajmniej jedna pozycja do rozliczenia.",
      );
    }
  }

  for (const [index, item] of service.optionalItems.entries()) {
    if (item.netAmount > 0 && !item.title.trim()) {
      errors.push(`Pozycja opcjonalna ${index + 1}: tytuł jest wymagany, gdy podano kwotę netto.`);
    }
    if (item.title.trim() && item.netAmount <= 0) {
      errors.push(`Pozycja opcjonalna ${index + 1}: podaj kwotę netto większą od zera.`);
    }
  }

  const numbers = [
    service.estimate.accommodations,
    service.estimate.supervisionHours,
    service.estimate.programmerHours,
    service.estimate.installerHours,
    service.estimate.helperHours,
    service.estimate.carHours,
    service.estimate.kilometersOneWay,
    service.estimate.tripCount,
    service.estimate.materialsCost,
    service.actual.accommodations,
    service.actual.supervisionHours,
    service.actual.programmerHours,
    service.actual.installerHours,
    service.actual.helperHours,
    service.actual.carHours,
    service.actual.kilometersOneWay,
    service.actual.tripCount,
    service.actual.materialsCost,
    service.rates.supervisionHourly,
    service.rates.installerHourly,
    service.rates.helperHourly,
    service.rates.programmerHourly,
    service.rates.carPerKm,
    service.rates.carHourly,
    service.rates.accommodationCost,
    service.estimateDiscounts.percentDiscount,
    service.estimateDiscounts.materialsPercentDiscount,
    service.estimateDiscounts.specialDiscountPln,
    service.actualDiscounts.percentDiscount,
    service.actualDiscounts.materialsPercentDiscount,
    service.actualDiscounts.specialDiscountPln,
  ];

  if (numbers.some((value) => value < 0)) {
    errors.push("Wartości liczbowe nie mogą być ujemne.");
  }

  return errors;
}
