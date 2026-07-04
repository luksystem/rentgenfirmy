import type { ServiceAiEstimateProposal } from "@/lib/service/ai-estimate-types";
import type { ServiceIntakePostWarrantyAction } from "@/lib/service-intake/types";
import {
  extractJsonObject,
  parseServiceAiEstimateProposal,
} from "@/lib/service/ai-estimate-normalize";
import type { ServiceType } from "@/lib/service/types";
import {
  formatServiceAiWarrantyContextForPrompt,
  type ServiceAiWarrantyContext,
} from "@/lib/project/warranty";

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

function buildIntakeActionPrompt(postWarrantyAction: ServiceIntakePostWarrantyAction | null) {
  if (!postWarrantyAction) {
    return "";
  }

  const sharedRecommendation = `
Rekomendacja sposobu działania (wymagane pole intakeRecommendation):
- Klient wybrał jedną z trzech opcji pogwarancyjnych: oferta / przyjazd / serwis zdalny.
- Oceń problem i w intakeRecommendation wskaż, która opcja jest najlepsza (recommendedAction: offer | on_site | remote).
- Uzasadnij w note — np. czy serwis zdalny wystarczy, czy prawdopodobny jest przyjazd, czy lepiej najpierw oferta.
- remoteOnlyViable=true tylko gdy problem realnie da się rozwiązać zdalnie bez wizyty.
- onsiteVisitLikelyRequired=true gdy bez wizyty w obiekcie prace mogą być nieskuteczne lub niemożliwe.`;

  if (postWarrantyAction === "offer") {
    return `
Preferencja klienta: PRZYGOTOWANIE OFERTY (offer).
- Wycen orientacyjnie pełny zakres: praca u klienta, praca zdalna, dojazd, noclegi (noclegi liczy aplikacja).
- Szacuj realistycznie zarówno programmerRemoteHours jak i programmerOnsiteHours / installerHours.
${sharedRecommendation}`;
  }

  if (postWarrantyAction === "on_site") {
    return `
Preferencja klienta: JAK NAJSZYBSZY PRZYJAZD (on_site).
- Wycen orientacyjnie pełny zakres: praca u klienta, praca zdalna, dojazd, noclegi (noclegi liczy aplikacja).
- Klient oczekuje działania na miejscu — uwzględnij typowy przyjazd serwisanta z dojazdem.
${sharedRecommendation}`;
  }

  return `
Preferencja klienta: SERWIS ZDALNY (remote).
- W wycenie kosztowej licz TYLKO pracę zdalną: programmerRemoteHours (ew. zdalny nadzór w supervisorHours).
- Ustaw installerHours=0, helperHours=0, programmerOnsiteHours=0, requiresTrip=false dla zadań.
- W summary jasno napisz, czy sam serwis zdalny wystarczy, czy może być konieczny przyjazd, albo czy zdalnie problem nie da się skutecznie rozwiązać.
- Dojazd i praca na miejscu NIE wchodzą do kosztów tej wyceny — opisz je tylko w rekomendacji, jeśli potrzebne.
${sharedRecommendation}`;
}

function buildPrompt(input: {
  description: string;
  serviceType: ServiceType;
  clientLocation: string;
  companyAddress: string;
  oneWayDistanceKm: number | null;
  referenceCases: ServiceAiReferenceCase[];
  projectContext: string | null;
  warrantyContext: string | null;
  postWarrantyAction: ServiceIntakePostWarrantyAction | null;
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

${
  input.warrantyContext
    ? `Gwarancja:
${input.warrantyContext}

`
    : ""
}Podobne rozliczenia historyczne:
${references}

${
  input.projectContext
    ? `Kontekst instalacji klienta (specyfikacja, ustalenia, wdrożenie):
"""
${input.projectContext}
"""

Zasady kontekstu projektu:
- Traktuj powyższe jako stan faktyczny instalacji — odróżniaj rozbudowę od prac od zera.
- Jeśli system już istnieje (np. DALI, podlewanie, BMS) — szacuj godziny i materiały dla rozbudowy/integracji, nie pełnej instalacji.
- Nie duplikuj prac oznaczonych jako zrealizowane w specyfikacji.
- Uwzględnij otwarte zadania wdrożenia i zaakceptowane ustalenia przy rozpoznawaniu recognizedTasks.
`
    : ""
}Zasady:
- Rozdziel zadania na listę recognizedTasks.
- Oznacz warrantyStatus: warranty | paid | mixed | unknown (szczególnie ważne przy aktywnej gwarancji — patrz sekcja Gwarancja powyżej).
- programmerOnsiteHours = praca u klienta, programmerRemoteHours = zdalnie.
- helperHours: podaj 0 — aplikacja ustawi pomocnika na tyle samo godzin co instalator (zazwyczaj jadą razem).
- Jeśli opis jest ogólny — obniż confidence i dodaj questions.
- Materiały tylko orientacyjnie, verificationRequired=true gdy niepewne.
- Nie zwracaj kwot robocizny/dojazdu — aplikacja liczy je ze stawek.
- Noclegi (overnights): ustaw 0 — aplikacja wyliczy je z odległości i liczby dni. Przy krótkim dojeździe (< progu km z ustawień) zawsze 0.
- estimatedTrips: przy krótkim dojeździe i wielodniowych pracach aplikacja liczy osobne wyjazdy na każdy dzień.
${buildIntakeActionPrompt(input.postWarrantyAction)}

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
      "warrantyStatus": "warranty",
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
  "riskFlags": ["string"]${
    input.postWarrantyAction
      ? `,
  "intakeRecommendation": {
    "recommendedAction": "on_site",
    "note": "string",
    "remoteOnlyViable": false,
    "onsiteVisitLikelyRequired": true
  }`
      : ""
  }
}`;
}

export async function generateServiceAiEstimate(input: {
  description: string;
  serviceType: ServiceType;
  clientLocation: string;
  companyAddress: string;
  oneWayDistanceKm: number | null;
  referenceCases: ServiceAiReferenceCase[];
  projectContext?: string | null;
  warrantyContext?: ServiceAiWarrantyContext | null;
  postWarrantyAction?: ServiceIntakePostWarrantyAction | null;
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
        {
          role: "user",
          content: buildPrompt({
            ...input,
            projectContext: input.projectContext?.trim() || null,
            warrantyContext: formatServiceAiWarrantyContextForPrompt(
              input.warrantyContext ?? null,
            ),
            postWarrantyAction: input.postWarrantyAction ?? null,
          }),
        },
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
