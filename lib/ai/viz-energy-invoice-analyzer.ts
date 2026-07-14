import type { VizEnergyInvoiceAnalysis } from "@/lib/viz/energy-types";

type AnalyzeEnergyInvoiceInput = {
  title: string;
  description?: string | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  totalKwh?: number | null;
  totalCostPln?: number | null;
  supplierName?: string | null;
};

function extractJsonObject(content: string): unknown {
  let text = content.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI nie zwróciło poprawnego JSON.");
  }
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

function buildRuleBasedAnalysis(input: AnalyzeEnergyInvoiceInput): VizEnergyInvoiceAnalysis {
  const anomalies: string[] = [];
  const recommendations: string[] = [];

  if (input.totalKwh != null && input.totalKwh > 50_000) {
    anomalies.push("Bardzo wysokie zużycie energii w okresie rozliczeniowym.");
  }
  if (input.totalCostPln != null && input.totalKwh != null && input.totalKwh > 0) {
    const unitCost = input.totalCostPln / input.totalKwh;
    if (unitCost > 1.2) {
      anomalies.push(`Wysoka cena jednostkowa (~${unitCost.toFixed(2)} PLN/kWh).`);
      recommendations.push("Porównaj taryfę i warunki umowy dystrybucyjnej z poprzednimi okresami.");
    }
  }
  if (!input.billingPeriodStart || !input.billingPeriodEnd) {
    recommendations.push("Uzupełnij okres rozliczeniowy, aby umożliwić porównania historyczne.");
  }
  if (!input.totalKwh) {
    recommendations.push("Wprowadź lub zweryfikuj zużycie kWh z faktury PDF.");
  }

  const summaryParts = [
    input.supplierName ? `Dostawca: ${input.supplierName}.` : null,
    input.totalKwh != null ? `Zużycie: ${input.totalKwh} kWh.` : null,
    input.totalCostPln != null ? `Koszt: ${input.totalCostPln.toFixed(2)} PLN.` : null,
    anomalies.length ? `Wykryto ${anomalies.length} potencjalnych anomalii.` : "Brak oczywistych anomalii w metadanych.",
  ].filter(Boolean);

  return {
    summary: summaryParts.join(" "),
    anomalies,
    recommendations,
    extractedFields: {
      totalKwh: input.totalKwh ?? null,
      totalCostPln: input.totalCostPln ?? null,
      supplierName: input.supplierName ?? null,
      billingPeriodStart: input.billingPeriodStart ?? null,
      billingPeriodEnd: input.billingPeriodEnd ?? null,
    },
    confidence: input.totalKwh != null && input.totalCostPln != null ? "medium" : "low",
    provider: "rules",
  };
}

export async function analyzeEnergyInvoice(
  input: AnalyzeEnergyInvoiceInput,
): Promise<VizEnergyInvoiceAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return buildRuleBasedAnalysis(input);
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const system = `Jesteś analitykiem faktur energii dla obiektów handlowych BMS.
Zwróć JSON: { "summary": string, "anomalies": string[], "recommendations": string[], "extractedFields": { "totalKwh": number|null, "totalCostPln": number|null, "supplierName": string|null, "billingPeriodStart": "YYYY-MM-DD"|null, "billingPeriodEnd": "YYYY-MM-DD"|null }, "confidence": "low"|"medium"|"high" }.
Analizuj metadane faktury — nie masz treści PDF, tylko pola użytkownika.`;

  const user = [
    `Tytuł: ${input.title}`,
    input.description ? `Opis: ${input.description}` : null,
    input.supplierName ? `Dostawca: ${input.supplierName}` : null,
    input.billingPeriodStart ? `Okres od: ${input.billingPeriodStart}` : null,
    input.billingPeriodEnd ? `Okres do: ${input.billingPeriodEnd}` : null,
    input.totalKwh != null ? `kWh: ${input.totalKwh}` : null,
    input.totalCostPln != null ? `Koszt PLN: ${input.totalCostPln}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
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
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      return buildRuleBasedAnalysis(input);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return buildRuleBasedAnalysis(input);
    }

    const parsed = extractJsonObject(content) as Partial<VizEnergyInvoiceAnalysis>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : buildRuleBasedAnalysis(input).summary,
      anomalies: Array.isArray(parsed.anomalies)
        ? parsed.anomalies.filter((item): item is string => typeof item === "string")
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((item): item is string => typeof item === "string")
        : [],
      extractedFields: {
        totalKwh:
          typeof parsed.extractedFields?.totalKwh === "number" ? parsed.extractedFields.totalKwh : input.totalKwh ?? null,
        totalCostPln:
          typeof parsed.extractedFields?.totalCostPln === "number"
            ? parsed.extractedFields.totalCostPln
            : input.totalCostPln ?? null,
        supplierName:
          typeof parsed.extractedFields?.supplierName === "string"
            ? parsed.extractedFields.supplierName
            : input.supplierName ?? null,
        billingPeriodStart:
          typeof parsed.extractedFields?.billingPeriodStart === "string"
            ? parsed.extractedFields.billingPeriodStart
            : input.billingPeriodStart ?? null,
        billingPeriodEnd:
          typeof parsed.extractedFields?.billingPeriodEnd === "string"
            ? parsed.extractedFields.billingPeriodEnd
            : input.billingPeriodEnd ?? null,
      },
      confidence:
        parsed.confidence === "low" || parsed.confidence === "medium" || parsed.confidence === "high"
          ? parsed.confidence
          : "medium",
      provider: "openai",
    };
  } catch {
    return buildRuleBasedAnalysis(input);
  }
}
