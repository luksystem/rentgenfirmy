import type { WorkOrderInput } from "@/lib/work-order/types";

export function validateWorkOrder(input: WorkOrderInput): string[] {
  const errors: string[] = [];

  if (!input.title.trim()) {
    errors.push("Tytuł zlecenia jest wymagany.");
  }

  if (!input.client.fullName.trim()) {
    errors.push("Imię i nazwisko klienta jest wymagane.");
  }

  return errors;
}
