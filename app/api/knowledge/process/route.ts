import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { analyzeKnowledgeImage } from "@/lib/ai/knowledge-image-analyzer";
import { chunkText } from "@/lib/knowledge/chunking";
import {
  extractTextFromCsvBuffer,
  extractTextFromPdfBuffer,
  extractTextFromPlainBuffer,
  extractTextFromWhatsAppBuffer,
  fetchAndExtractLinkContent,
  fetchYoutubeTranscriptAndTitle,
} from "@/lib/knowledge/text-extraction";
import { KNOWLEDGE_BASE_BUCKET } from "@/lib/supabase/knowledge-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { KnowledgeSourceRow } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

async function extractContent(
  source: KnowledgeSourceRow,
): Promise<{ text: string; titleOverride?: string | null; truncated?: boolean }> {
  const supabase = getSupabaseAdmin();

  if (
    source.type === "pdf" ||
    source.type === "text" ||
    source.type === "whatsapp" ||
    source.type === "csv"
  ) {
    if (!source.storage_path) {
      throw new Error("Brak pliku dla tego źródła.");
    }
    const { data, error } = await supabase.storage
      .from(KNOWLEDGE_BASE_BUCKET)
      .download(source.storage_path);
    if (error || !data) {
      throw new Error(error?.message ?? "Nie udało się pobrać pliku z magazynu.");
    }
    const buffer = Buffer.from(await data.arrayBuffer());

    if (source.type === "pdf") {
      const extracted = await extractTextFromPdfBuffer(buffer);
      return { text: extracted.text, truncated: extracted.truncated };
    }
    if (source.type === "whatsapp") {
      const extracted = extractTextFromWhatsAppBuffer(buffer);
      return { text: extracted.text, truncated: extracted.truncated };
    }
    if (source.type === "csv") {
      const extracted = extractTextFromCsvBuffer(buffer);
      return { text: extracted.text, truncated: extracted.truncated };
    }
    const extracted = extractTextFromPlainBuffer(buffer);
    return { text: extracted.text, truncated: extracted.truncated };
  }

  if (source.type === "link") {
    if (!source.url) {
      throw new Error("Brak adresu URL dla tego źródła.");
    }
    const { text, title, truncated } = await fetchAndExtractLinkContent(source.url);
    return { text, titleOverride: title, truncated };
  }

  if (source.type === "youtube") {
    if (!source.url) {
      throw new Error("Brak adresu URL filmu YouTube.");
    }
    const { text, title, truncated } = await fetchYoutubeTranscriptAndTitle(source.url);
    return { text, titleOverride: title, truncated };
  }

  if (source.type === "image") {
    if (!source.storage_path) {
      throw new Error("Brak pliku zdjęcia.");
    }
    const { data, error } = await supabase.storage
      .from(KNOWLEDGE_BASE_BUCKET)
      .createSignedUrl(source.storage_path, 300);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Nie udało się przygotować adresu zdjęcia.");
    }
    const text = await analyzeKnowledgeImage({
      imageUrl: data.signedUrl,
      contextNote: source.description,
    });
    return { text };
  }

  throw new Error(`Nieobsługiwany typ źródła: ${source.type}`);
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const sourceId =
    body && typeof body === "object" && typeof (body as { sourceId?: unknown }).sourceId === "string"
      ? (body as { sourceId: string }).sourceId
      : null;

  if (!sourceId) {
    return NextResponse.json({ error: "Brak identyfikatora źródła." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: sourceRow, error: sourceError } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError || !sourceRow) {
    return NextResponse.json({ error: "Nie znaleziono źródła." }, { status: 404 });
  }

  await supabase
    .from("knowledge_sources")
    .update({ status: "processing", error_message: null })
    .eq("id", sourceId);

  try {
    const { text, titleOverride, truncated } = await extractContent(sourceRow as KnowledgeSourceRow);
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Nie udało się wydobyć żadnej treści z tego źródła.");
    }

    const chunks = chunkText(trimmed);
    if (chunks.length === 0) {
      throw new Error("Treść źródła jest zbyt krótka do zapisania.");
    }

    await supabase.from("knowledge_chunks").delete().eq("source_id", sourceId);
    const { error: insertError } = await supabase.from("knowledge_chunks").insert(
      chunks.map((content, index) => ({
        source_id: sourceId,
        chunk_index: index,
        content,
      })),
    );
    if (insertError) {
      throw new Error(insertError.message);
    }

    const titleUpdate =
      titleOverride && (!sourceRow.title || sourceRow.title === sourceRow.url)
        ? { title: titleOverride }
        : {};

    // Nie fatalne — źródło jest gotowe i przeszukiwalne, ale nie w całości. Wcześniej takie
    // obcięcie (np. archiwum CSV wgrane jako baza wiedzy, patrz migracja 317) było całkowicie
    // ciche: status "ready", error_message puste, jedyny ślad to okrągła liczba w char_count,
    // której nikt nie miał powodu podejrzewać.
    const truncationWarning = truncated
      ? "Uwaga: plik był za duży i został przycięty przy przetwarzaniu — baza wiedzy zna tylko jego początkową część. Podziel go na mniejsze pliki, żeby ująć całość."
      : null;

    await supabase
      .from("knowledge_sources")
      .update({
        status: "ready",
        error_message: truncationWarning,
        char_count: trimmed.length,
        updated_at: new Date().toISOString(),
        ...titleUpdate,
      })
      .eq("id", sourceId);

    return NextResponse.json({
      ok: true,
      chunkCount: chunks.length,
      charCount: trimmed.length,
      truncated: Boolean(truncated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się przetworzyć źródła.";
    await supabase
      .from("knowledge_sources")
      .update({ status: "error", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", sourceId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
