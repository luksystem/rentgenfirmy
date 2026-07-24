import { DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS } from "@/lib/smart-home-kb/ai-settings";
import type { SmartHomeKbArticleStep } from "@/lib/smart-home-kb/types";

export const SMART_HOME_KB_RESTRUCTURE_MAX_INPUT_CHARS = 6_000;

function buildPrompt(input: { draftText: string; instructions: string }) {
  const instructions = input.instructions.trim() || DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS;

  return `${instructions}

Tekst do uporządkowania:
"""
${input.draftText}
"""

Odpowiedz WYŁĄCZNIE poprawnym JSON w formacie:
{
  "contextHtml": "krótki akapit kontekstu (zwykły tekst lub proste HTML: <p>, <b>, <i>)",
  "steps": [{ "title": "krótki tytuł kroku (opcjonalnie, może być pusty string)", "bodyHtml": "opis kroku" }],
  "tipsHtml": "wskazówki/uwagi/ostrzeżenia (może być pusty string, jeśli brak)"
}`;
}

export type SmartHomeKbRestructureResult = {
  contextHtml: string;
  steps: SmartHomeKbArticleStep[];
  tipsHtml: string;
};

export async function generateSmartHomeKbRestructure(input: {
  draftText: string;
  instructions?: string;
}): Promise<SmartHomeKbRestructureResult> {
  const plain = input.draftText.trim();
  if (!plain) {
    throw new Error("Brak treści do uporządkowania.");
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
            "Jesteś redaktorem technicznym porządkującym treści bazy wiedzy Smart Home. Odpowiadasz wyłącznie w formacie JSON, po polsku.",
        },
        {
          role: "user",
          content: buildPrompt({
            draftText: plain.slice(0, SMART_HOME_KB_RESTRUCTURE_MAX_INPUT_CHARS),
            instructions: input.instructions ?? DEFAULT_SMART_HOME_KB_RESTRUCTURE_INSTRUCTIONS,
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
    throw new Error("OpenAI nie zwróciło wyniku.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi AI.");
  }

  const data = (parsed ?? {}) as Record<string, unknown>;
  const steps = Array.isArray(data.steps)
    ? data.steps
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          title: typeof item.title === "string" ? item.title.trim() : "",
          bodyHtml: typeof item.bodyHtml === "string" ? item.bodyHtml.trim() : "",
        }))
        .filter((step) => step.bodyHtml.length > 0)
    : [];

  return {
    contextHtml: typeof data.contextHtml === "string" ? data.contextHtml.trim() : "",
    steps,
    tipsHtml: typeof data.tipsHtml === "string" ? data.tipsHtml.trim() : "",
  };
}
