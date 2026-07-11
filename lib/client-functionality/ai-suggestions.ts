import type {
  FunctionalityAiSuggestion,
  FunctionalityTaskPriority,
} from "@/lib/client-functionality/types";
import type { ProjectSpecificationItem } from "@/lib/dashboard/specification-types";
import type { SpecificationCatalogItem } from "@/lib/dashboard/specification-types";
import { buildSurveyQuestions } from "@/lib/client-functionality/generator";

export type AiSuggestionInput = {
  specItems: ProjectSpecificationItem[];
  catalog: SpecificationCatalogItem[];
  extraQuestions?: import("@/lib/client-functionality/types").ClientFunctionalityTemplateItem[];
  projectName?: string;
};

function parseAiSuggestionsJson(content: string): FunctionalityAiSuggestion[] {
  let raw = content.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(raw) as { suggestions?: unknown[] };
  if (!Array.isArray(parsed.suggestions)) {
    return [];
  }

  const validPriorities = new Set<FunctionalityTaskPriority>(["must", "standard", "optional"]);

  return parsed.suggestions
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      id: typeof entry.id === "string" ? entry.id : `ai-${index + 1}`,
      title: String(entry.title ?? "Propozycja automatyzacji"),
      description: String(entry.description ?? ""),
      category: String(entry.category ?? "Automatyzacje"),
      priority: validPriorities.has(entry.priority as FunctionalityTaskPriority)
        ? (entry.priority as FunctionalityTaskPriority)
        : "standard",
      rationale: String(entry.rationale ?? ""),
      status: "pending" as const,
    }))
    .slice(0, 8);
}

function buildPrompt(input: AiSuggestionInput) {
  const questions = buildSurveyQuestions(input.specItems, input.catalog, input.extraQuestions);
  const specLines = input.specItems.map((item) => `- ${item.title} (${item.category})`).join("\n");
  const questionLines = questions
    .map((q) => `- [${q.catalogItemName}] ${q.title}`)
    .join("\n");

  return `Jesteś ekspertem Smart Home / BMS. Na podstawie specyfikacji projektu zaproponuj DODATKOWE automatyzacje i scenariusze, których nie ma jeszcze w szablonowej ankiecie.

Projekt: ${input.projectName ?? "Smart Home"}

Specyfikacja:
${specLines || "(brak)"}

Istniejące pytania ankiety (NIE duplikuj):
${questionLines || "(brak)"}

Zwróć JSON w formacie:
{
  "suggestions": [
    {
      "id": "unikalny-slug",
      "title": "Krótki tytuł zadania wdrożeniowego",
      "description": "Co wdrożeniowiec ma skonfigurować",
      "category": "Automatyzacje | Oświetlenie | Rolety | HVAC | Alarm | ...",
      "priority": "must | standard | optional",
      "rationale": "Dlaczego to ma sens przy tej specyfikacji"
    }
  ]
}

Zasady:
- 3–6 propozycji łączących systemy (np. alarm + rolety, wejście + HVAC)
- Po polsku
- Konkretne, wykonalne zadania dla integratora
- Nie powtarzaj oczywistych rzeczy już w pytaniach
- Tylko JSON, bez markdown`;
}

export async function suggestFunctionalityWithAi(
  input: AiSuggestionInput,
): Promise<FunctionalityAiSuggestion[]> {
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
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Generujesz propozycje automatyzacji Smart Home. Odpowiadaj wyłącznie poprawnym JSON bez komentarzy.",
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
    throw new Error("OpenAI nie zwróciło propozycji.");
  }

  return parseAiSuggestionsJson(content);
}
