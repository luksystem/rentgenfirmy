import type { KnowledgeSuggestionExcerpt } from "@/lib/ai/knowledge-suggestion-generator";
import { buildOrTsQuery } from "@/lib/knowledge/search-query";
import type { KnowledgeChunkRow, KnowledgeSourceRow } from "@/lib/supabase/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Przeszukuje wycinki bazy wiedzy (dokumenty/linki/YouTube dodane ręcznie) pod dany opis. */
export async function searchKnowledgeChunks(
  description: string,
  limit = 6,
): Promise<KnowledgeSuggestionExcerpt[]> {
  const query = buildOrTsQuery(description);
  if (!query) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data: chunkRows, error: chunkError } = await supabase
    .from("knowledge_chunks")
    .select("content, source_id")
    .textSearch("content", query, { config: "simple" })
    .limit(limit * 4);

  if (chunkError || !chunkRows || chunkRows.length === 0) {
    return [];
  }

  const sourceIds = [...new Set(chunkRows.map((row) => (row as KnowledgeChunkRow).source_id))];
  const { data: sourceRows } = await supabase
    .from("knowledge_sources")
    .select("id, title, type, status")
    .in("id", sourceIds);

  const sourcesById = new Map(
    ((sourceRows ?? []) as Array<Pick<KnowledgeSourceRow, "id" | "title" | "type" | "status">>).map(
      (row) => [row.id, row],
    ),
  );

  const excerpts: KnowledgeSuggestionExcerpt[] = [];
  for (const row of chunkRows as Array<Pick<KnowledgeChunkRow, "content" | "source_id">>) {
    const source = sourcesById.get(row.source_id);
    if (!source || source.status !== "ready") {
      continue;
    }
    excerpts.push({ sourceTitle: source.title, sourceType: source.type, content: row.content });
    if (excerpts.length >= limit) {
      break;
    }
  }

  return excerpts;
}

/** Przeszukuje na żywo opisy i komentarze historycznych zgłoszeń serwisowych pod dany opis. */
export async function searchServiceIntakeHistory(
  description: string,
  limit = 6,
): Promise<string[]> {
  const query = buildOrTsQuery(description);
  if (!query) {
    return [];
  }

  const supabase = getSupabaseAdmin();

  const [descriptionResult, commentResult] = await Promise.all([
    supabase
      .from("service_intake_requests")
      .select("description")
      .textSearch("description", query, { config: "simple" })
      .limit(limit),
    supabase
      .from("service_intake_comments")
      .select("body")
      .textSearch("body", query, { config: "simple" })
      .limit(limit),
  ]);

  const excerpts: string[] = [];
  for (const row of descriptionResult.data ?? []) {
    const description = (row as { description: string }).description;
    if (description) {
      excerpts.push(description);
    }
  }
  for (const row of commentResult.data ?? []) {
    const body = (row as { body: string }).body;
    if (body) {
      excerpts.push(body);
    }
  }

  return excerpts.slice(0, limit);
}
