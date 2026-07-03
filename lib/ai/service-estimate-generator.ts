import type { ServiceAiEstimateProposal } from "@/lib/service/ai-estimate-types";
import {
  extractJsonObject,
  parseServiceAiEstimateProposal,
} from "@/lib/service/ai-estimate-normalize";
import type { ServiceType } from "@/lib/service/types";

export const SERVICE_AI_MAX_INPUT_CHARS = 12_000;

export type ServiceAiReferenceCase = {
  title: string;
  description: string;
  serviceType: ServiceType;
  distanceKm: number;
  estimateHours: number;
  actualHours: number;
  netDeltaPercent: number;
};

function buildPrompt(input: {
  description: string;
  serviceType: ServiceType;
  clientLocation: string;
  companyAddress: string;
  oneWayDistanceKm: number | null;
  referenceCases: ServiceAiReferenceCase[];
}) {
  const references =
    input.referenceCases.length > 0
      ? input.referenceCases
          .map(
            (item, index) =>
              `${index + 1}. ${item.title} (${item.serviceType}, ${item.distanceKm} km): szac. ${item.estimateHours}h → rzecz. ${item.actualHours}h, odchylenie ${item.netDeltaPercent}%. Opis: ${item.description.slice(0, 280)}`,
          )
          .join("\n")
      : "Brak podobnych rozliczeń historycznych.";

  return `Jesteś asystentem wyceny serwisowej firmy Smart Home / BMS.

Twoje zadanie: na podstawie opisu zgłoszenia zaproponuj ORIENTACYJNE roboczogodziny i strukturę prac.
NIE wyceniaj stawek ani kwot — tylko godziny, wyjazdy, noclegi i orientacyjny sprzęt.

Kontekst:
- Typ serwisu: ${input.serviceType}
- Lokalizacja klienta: ${input.clientLocation || "niepodana"}
- Baza firmy: ${input.companyAddress || "niepodana"}
- Odległość od bazy (jeśli znana): ${input.oneWayDistanceKm ?? "nieznana"} km w jedną stronę

Podobne rozliczenia historyczne:
${references}

Zasady:
- Rozdziel zadania na listę recognizedTasks.
- Oznacz warrantyStatus: warranty | paid | mixed | unknown.
- programmerOnsiteHours = praca u klienta, programmerRemoteHours = zdalnie.
- Jeśli opis jest ogólny — obniż confidence i dodaj questions.
- Materiały tylko orientacyjnie, verificationRequired=true gdy niepewne.
- Nie zwracaj kwot robocizny/dojazdu — aplikacja liczy je ze stawek.

Opis zgłoszenia:
"""
${input.description}
"""

Odpowiedz WYŁĄCZNIE poprawnym JSON:
{
  "confidence": 0.78,
  "summary": "string",
  "recognizedTasks": [
    {
      "name": "string",
      "category": "string",
      "warrantyStatus": "paid",
      "installerHours": 1,
      "helperHours": 0,
      "programmerOnsiteHours": 0,
      "programmerRemoteHours": 0.5,
      "supervisorHours": 0.1,
      "requiresTrip": true,
      "notes": "string"
    }
  ],
  "travel": {
    "estimatedTrips": 1,
    "oneWayDistanceKm": 80,
    "totalDistanceKm": 160,
    "estimatedDriveTimeHours": 3,
    "overnightRequired": false,
    "overnights": 0
  },
  "materials": [
    {
      "name": "string",
      "estimatedNetPriceMin": 700,
      "estimatedNetPriceMax": 1200,
      "confidence": 0.55,
      "verificationRequired": true,
      "notes": "string"
    }
  ],
  "questions": ["string"],
  "riskFlags": ["string"]
}`;
}

export async function generateServiceAiEstimate(input: {
  description: string;
  serviceType: ServiceType;
  clientLocation: string;
  companyAddress: string;
  oneWayDistanceKm: number | null;
  referenceCases: ServiceAiReferenceCase[];
}): Promise<ServiceAiEstimateProposal> {
  const plain = input.description.trim();
  if (!plain) {
    throw new Error("Wpisz opis prac do oszacowania.");
  }
  if (plain.length > SERVICE_AI_MAX_INPUT_CHARS) {
    throw new Error(`Opis jest zbyt długi (max ${SERVICE_AI_MAX_INPUT_CHARS} znaków).`);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Brak klucza OPENAI_API_KEY w konfiguracji serwera.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Jesteś asystentem wyceny serwisowej Smart Home. Zwracaj wyłącznie JSON zgodny ze schematem. Nie podawaj kwot robocizny.",
        },
        { role: "user", content: buildPrompt(input) },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      errorBody.trim()
        ? `OpenAI: ${errorBody.slice(0, 240)}`
        : `OpenAI zwróciło błąd HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI nie zwróciło propozycji wyceny.");
  }

  return parseServiceAiEstimateProposal(extractJsonObject(content));
}
