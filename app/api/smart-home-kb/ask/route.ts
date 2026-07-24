import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { generateSmartHomeKbAnswer, type SmartHomeKbAssistantExcerpt } from "@/lib/ai/smart-home-kb-assistant";
import { searchSmartHomeKnowledgeBase } from "@/lib/supabase/smart-home-kb-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();

    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim() ?? "";
    if (question.length < 3) {
      return NextResponse.json({ error: "Wpisz pytanie." }, { status: 400 });
    }

    const { articles, faqItems } = await searchSmartHomeKnowledgeBase(question);

    const excerpts: SmartHomeKbAssistantExcerpt[] = [
      ...articles.slice(0, 5).map((article) => ({
        title: article.title,
        slug: article.slug,
        kind: "article" as const,
        content: [article.summary, article.contextHtml, article.tipsHtml].filter(Boolean).join("\n"),
      })),
      ...faqItems.slice(0, 5).map((faq) => ({
        title: faq.question,
        slug: "",
        kind: "faq" as const,
        content: faq.answerHtml,
      })),
    ];

    const result = await generateSmartHomeKbAnswer({ question, excerpts });

    const sources = articles
      .filter((article) => result.usedSlugs.includes(article.slug))
      .map((article) => ({ title: article.title, slug: article.slug }));

    return NextResponse.json({ ok: true, answer: result.answer, sources });
  } catch (error) {
    return jsonError(error);
  }
}
