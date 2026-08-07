import { emptyCalculatorAnswers, emptyCalculatorClient, type CalculatorOffer } from "@/lib/calculator/types";

export function createEmptyCalculatorOffer(): CalculatorOffer {
  return {
    id: crypto.randomUUID(),
    status: "draft",
    clientId: null,
    contactId: null,
    title: "",
    client: emptyCalculatorClient(),
    answers: emptyCalculatorAnswers(),
    contractId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
