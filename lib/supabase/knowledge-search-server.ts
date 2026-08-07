import type { KnowledgeSuggestionExcerpt } from "@/lib/ai/knowledge-suggestion-generator";
import { buildOrTsQuery } from "@/lib/knowledge/search-query";
import type { KnowledgeSourceRow } from "@/lib/supabase/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Przeszukuje wycinki bazy wiedzy (dokumenty/linki/YouTube dodane ręcznie) pod dany opis.
 * Zamawia `limit * 4` kandydatów posortowanych wg trafności (ts_rank_cd — patrz migracja 317),
 * nie pierwsze trafienia po kolei — przy dużym źródle (np. archiwum zgłoszeń z ActiveCollab, setki
 * wycinków) proste "pierwsze n dopasowań" prawie zawsze pomijało najlepiej pasujące fragmenty.
 */
export async function searchKnowledgeChunks(
  description: string,
  limit = 6,
): Promise<KnowledgeSuggestionExcerpt[]> {
  const query = buildOrTsQuery(description);
  if (!query) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data: chunkRows, error: chunkError } = await supabase.rpc(
    "search_knowledge_chunks_ranked",
    { p_query: query, p_limit: limit * 4 },
  );

  if (chunkError || !chunkRows || chunkRows.length === 0) {
    return [];
  }

  const sourceIds = [...new Set(chunkRows.map((row) => row.source_id))];
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
  for (const row of chunkRows) {
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

/** Przeszukuje na żywo opisy i komentarze historycznych zgłoszeń serwisowych pod dany opis —
 *  posortowane wg trafności (ts_rank_cd), tym samym wzorcem co searchKnowledgeChunks. */
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
    supabase.rpc("search_service_intake_descriptions_ranked", { p_query: query, p_limit: limit }),
    supabase.rpc("search_service_intake_comments_ranked", { p_query: query, p_limit: limit }),
  ]);

  const excerpts: string[] = [];
  for (const row of descriptionResult.data ?? []) {
    if (row.description) {
      excerpts.push(row.description);
    }
  }
  for (const row of commentResult.data ?? []) {
    if (row.body) {
      excerpts.push(row.body);
    }
  }

  return excerpts.slice(0, limit);
}
