const SYSTEM_PROMPT = `Jesteś asystentem opisującym zdjęcia na potrzeby bazy wiedzy firmy instalującej
systemy Smart Home / BMS. Opisz szczegółowo i konkretnie, co widać na zdjęciu: urządzenia, modele,
oznaczenia na etykietach, sposób okablowania/montażu, ekrany i komunikaty (błędy, ustawienia) —
przepisz CAŁY czytelny tekst z etykiet, ekranów i tabliczek znamionowych. Jeśli to zrzut ekranu
aplikacji/panelu, opisz strukturę menu i widoczne wartości. Odpowiadaj po polsku, samym opisem,
bez wstępów typu "Na zdjęciu widać".`;

export async function analyzeKnowledgeImage(input: {
  imageUrl: string;
  contextNote?: string | null;
}): Promise<string> {
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
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: input.contextNote?.trim()
                ? `Kontekst od osoby dodającej zdjęcie: ${input.contextNote.trim()}`
                : "Opisz to zdjęcie na potrzeby bazy wiedzy serwisowej.",
            },
            {
              type: "image_url",
              image_url: { url: input.imageUrl },
            },
          ],
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
    throw new Error("OpenAI nie zwróciło opisu zdjęcia.");
  }

  return content;
}
