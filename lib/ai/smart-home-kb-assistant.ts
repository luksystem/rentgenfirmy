export type SmartHomeKbAssistantExcerpt = {
  title: string;
  slug: string;
  kind: "article" | "faq";
  content: string;
};

function buildPrompt(input: { question: string; excerpts: SmartHomeKbAssistantExcerpt[] }) {
  const excerptsBlock =
    input.excerpts.length > 0
      ? input.excerpts
          .map((item, index) => `[${index + 1}] "${item.title}" (${item.kind})\n${item.content.slice(0, 1200)}`)
          .join("\n\n")
      : "Brak dopasowanych wpisów w bazie wiedzy.";

  return `Jesteś asystentem klienta systemu Smart Home. Odpowiadasz WYŁĄCZNIE na podstawie poniższych
fragmentów bazy wiedzy — nie zgaduj i nie wymyślaj informacji, których tam nie ma. Jeśli fragmenty nie
zawierają odpowiedzi, napisz uprzejmie, że nie znaleziono informacji i zaproponuj kontakt z serwisem.
Pisz krótko, prostym językiem, po polsku.

Pytanie klienta:
"""
${input.question}
"""

Fragmenty bazy wiedzy:
${excerptsBlock}

Odpowiedz WYŁĄCZNIE poprawnym JSON:
{
  "answer": "odpowiedź dla klienta (2-6 zdań, po polsku)",
  "usedSlugs": ["slug-artykulu-1"]
}`;
}

export type SmartHomeKbAssistantResult = {
  answer: string;
  usedSlugs: string[];
};

export async function generateSmartHomeKbAnswer(input: {
  question: string;
  excerpts: SmartHomeKbAssistantExcerpt[];
}): Promise<SmartHomeKbAssistantResult> {
  const question = input.question.trim();
  if (!question) {
    throw new Error("Brak pytania.");
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
            "Jesteś rzetelnym asystentem klienta. Odpowiadasz tylko na podstawie dostarczonego kontekstu, po polsku, w formacie JSON.",
        },
        { role: "user", content: buildPrompt({ question, excerpts: input.excerpts }) },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      errorBody.trim() ? `OpenAI: ${errorBody.slice(0, 240)}` : `OpenAI zwróciło błąd HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI nie zwróciło odpowiedzi.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi AI.");
  }

  const data = (parsed ?? {}) as Record<string, unknown>;
  return {
    answer: typeof data.answer === "string" ? data.answer.trim() : "",
    usedSlugs: Array.isArray(data.usedSlugs)
      ? data.usedSlugs.filter((slug): slug is string => typeof slug === "string")
      : [],
  };
}
