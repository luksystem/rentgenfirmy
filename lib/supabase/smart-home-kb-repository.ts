import type {
  SmartHomeKbArticleMediaRow,
  SmartHomeKbArticleRow,
  SmartHomeKbCategoryRow,
  SmartHomeKbFaqItemRow,
  SmartHomeKbTagRow,
} from "@/lib/supabase/database.types";
import {
  slugifySmartHomeKb,
  type SmartHomeKbArticle,
  type SmartHomeKbArticleMedia,
  type SmartHomeKbArticleStep,
  type SmartHomeKbCategory,
  type SmartHomeKbFaqItem,
  type SmartHomeKbStatus,
  type SmartHomeKbTag,
} from "@/lib/smart-home-kb/types";
import { getSupabase } from "@/lib/supabase/client";
import { chunkText } from "@/lib/knowledge/chunking";

export const SMART_HOME_KB_BUCKET = "smart-home-kb-media";
export const SMART_HOME_KB_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SMART_HOME_KB_SIGNED_URL_TTL_SEC = 60 * 60;

type SupabaseClientLike = ReturnType<typeof getSupabase>;

function isStatus(value: string): value is SmartHomeKbStatus {
  return value === "draft" || value === "published";
}

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Zasila istniejący mechanizm AI (sugestie przy zgłoszeniach serwisowych) treścią opublikowanych
 * artykułów/FAQ Wiedzy Smart Home — mirror do knowledge_sources/knowledge_chunks, bez zmian w
 * samym mechanizmie wyszukiwania/sugestii.
 */
async function syncKnowledgeSourceMirror(
  supabase: SupabaseClientLike,
  input: { id: string; type: "smart_home_article" | "smart_home_faq"; title: string; description: string; plainText: string },
): Promise<void> {
  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from("knowledge_sources").upsert(
    {
      id: input.id,
      type: input.type,
      title: input.title || "(bez tytułu)",
      description: input.description,
      status: "ready",
      char_count: input.plainText.length,
      created_by_name: "Wiedza Smart Home",
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (upsertError) {
    return;
  }

  const { error: deleteError } = await supabase.from("knowledge_chunks").delete().eq("source_id", input.id);
  if (deleteError) {
    return;
  }

  const chunks = chunkText(input.plainText);
  if (chunks.length === 0) {
    return;
  }

  await supabase.from("knowledge_chunks").insert(
    chunks.map((content, index) => ({ source_id: input.id, chunk_index: index, content })),
  );
}

async function removeKnowledgeSourceMirror(supabase: SupabaseClientLike, id: string): Promise<void> {
  await supabase.from("knowledge_sources").delete().eq("id", id);
}

function articlePlainText(article: {
  title: string;
  summary: string;
  contextHtml: string;
  steps: SmartHomeKbArticleStep[];
  tipsHtml: string;
  bodyHtml: string;
}): string {
  const stepsText = article.steps
    .map((step) => `${step.title ? `${step.title}: ` : ""}${stripHtmlToPlainText(step.bodyHtml)}`)
    .join("\n");
  return [
    article.title,
    article.summary,
    stripHtmlToPlainText(article.contextHtml),
    stepsText,
    stripHtmlToPlainText(article.tipsHtml),
    stripHtmlToPlainText(article.bodyHtml),
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
}

/** Publikuje/aktualizuje lub usuwa mirror artykułu w bazie wiedzy AI, w zależności od statusu. */
async function syncArticleKnowledgeMirror(
  supabase: SupabaseClientLike,
  article: {
    id: string;
    title: string;
    summary: string;
    contextHtml: string;
    steps: SmartHomeKbArticleStep[];
    tipsHtml: string;
    bodyHtml: string;
    status: SmartHomeKbStatus;
  },
): Promise<void> {
  if (article.status !== "published") {
    await removeKnowledgeSourceMirror(supabase, article.id);
    return;
  }
  await syncKnowledgeSourceMirror(supabase, {
    id: article.id,
    type: "smart_home_article",
    title: article.title,
    description: article.summary,
    plainText: articlePlainText(article),
  });
}

async function syncFaqKnowledgeMirror(
  supabase: SupabaseClientLike,
  faq: { id: string; question: string; answerHtml: string; status: SmartHomeKbStatus },
): Promise<void> {
  if (faq.status !== "published") {
    await removeKnowledgeSourceMirror(supabase, faq.id);
    return;
  }
  await syncKnowledgeSourceMirror(supabase, {
    id: faq.id,
    type: "smart_home_faq",
    title: faq.question,
    description: "",
    plainText: `${faq.question}\n\n${stripHtmlToPlainText(faq.answerHtml)}`,
  });
}

function parseArticleSteps(value: unknown): SmartHomeKbArticleStep[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "",
      bodyHtml: typeof item.bodyHtml === "string" ? item.bodyHtml : "",
    }));
}

function rowToCategory(row: SmartHomeKbCategoryRow): SmartHomeKbCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTag(row: SmartHomeKbTagRow): SmartHomeKbTag {
  return { id: row.id, slug: row.slug, name: row.name, createdAt: row.created_at };
}

function rowToFaqItem(row: SmartHomeKbFaqItemRow): SmartHomeKbFaqItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    question: row.question,
    answerHtml: row.answer_html,
    sortOrder: row.sort_order,
    status: isStatus(row.status) ? row.status : "published",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMedia(row: SmartHomeKbArticleMediaRow): SmartHomeKbArticleMedia {
  return {
    id: row.id,
    articleId: row.article_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    url: null,
  };
}

type ArticleJoinRow = SmartHomeKbArticleRow & {
  smart_home_kb_article_tags: { tag_id: string }[] | null;
  smart_home_kb_article_media: SmartHomeKbArticleMediaRow[] | null;
};

async function signStoragePaths(
  supabase: SupabaseClientLike,
  paths: string[],
): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths));
  const map = new Map<string, string>();
  if (uniquePaths.length === 0) {
    return map;
  }

  const { data, error } = await supabase.storage
    .from(SMART_HOME_KB_BUCKET)
    .createSignedUrls(uniquePaths, SMART_HOME_KB_SIGNED_URL_TTL_SEC);

  if (error || !data) {
    return map;
  }

  for (const item of data) {
    if (item.path && item.signedUrl) {
      map.set(item.path, item.signedUrl);
    }
  }

  return map;
}

async function rowToArticle(
  row: ArticleJoinRow,
  supabase: SupabaseClientLike,
): Promise<SmartHomeKbArticle> {
  const media = (row.smart_home_kb_article_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(rowToMedia);

  const pathsToSign = [
    ...(row.cover_image_storage_path ? [row.cover_image_storage_path] : []),
    ...media.map((item) => item.storagePath),
  ];
  const signedUrls = await signStoragePaths(supabase, pathsToSign);

  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    bodyHtml: row.body_html,
    contextHtml: row.context_html,
    steps: parseArticleSteps(row.steps),
    tipsHtml: row.tips_html,
    youtubeUrl: row.youtube_url,
    coverImageStoragePath: row.cover_image_storage_path,
    coverImageUrl: row.cover_image_storage_path
      ? (signedUrls.get(row.cover_image_storage_path) ?? null)
      : null,
    status: isStatus(row.status) ? row.status : "published",
    sortOrder: row.sort_order,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds: (row.smart_home_kb_article_tags ?? []).map((item) => item.tag_id),
    media: media.map((item) => ({ ...item, url: signedUrls.get(item.storagePath) ?? null })),
  };
}

const ARTICLE_SELECT = "*, smart_home_kb_article_tags(tag_id), smart_home_kb_article_media(*)";

export async function fetchSmartHomeKbCategories(): Promise<SmartHomeKbCategory[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToCategory(row as SmartHomeKbCategoryRow));
}

export async function createSmartHomeKbCategory(input: {
  name: string;
  description?: string;
}): Promise<SmartHomeKbCategory> {
  const supabase = getSupabase();
  const slug = await uniqueSlug(supabase, "smart_home_kb_categories", input.name);

  const { data, error } = await supabase
    .from("smart_home_kb_categories")
    .insert({ slug, name: input.name.trim(), description: input.description?.trim() ?? "" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToCategory(data as SmartHomeKbCategoryRow);
}

export async function updateSmartHomeKbCategory(
  id: string,
  input: { name: string; description?: string },
): Promise<SmartHomeKbCategory> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_categories")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToCategory(data as SmartHomeKbCategoryRow);
}

export async function deleteSmartHomeKbCategory(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("smart_home_kb_categories").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchSmartHomeKbTags(): Promise<SmartHomeKbTag[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToTag(row as SmartHomeKbTagRow));
}

async function uniqueSlug(
  supabase: SupabaseClientLike,
  table: "smart_home_kb_categories" | "smart_home_kb_tags" | "smart_home_kb_articles",
  label: string,
): Promise<string> {
  const base = slugifySmartHomeKb(label);
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const { data, error } = await supabase.from(table).select("id").eq("slug", candidate).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

/** Zwraca istniejący tag o tej nazwie albo tworzy nowy — używane przy tworzeniu tagów "w locie" z formularza. */
export async function findOrCreateSmartHomeKbTag(name: string): Promise<SmartHomeKbTag> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nazwa tagu nie może być pusta.");
  }

  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("smart_home_kb_tags")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing) {
    return rowToTag(existing as SmartHomeKbTagRow);
  }

  const slug = await uniqueSlug(supabase, "smart_home_kb_tags", trimmed);
  const { data, error } = await supabase
    .from("smart_home_kb_tags")
    .insert({ slug, name: trimmed })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToTag(data as SmartHomeKbTagRow);
}

export async function renameSmartHomeKbTag(id: string, name: string): Promise<SmartHomeKbTag> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_tags")
    .update({ name: name.trim() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToTag(data as SmartHomeKbTagRow);
}

export async function deleteSmartHomeKbTag(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("smart_home_kb_tags").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchSmartHomeKbArticles(): Promise<SmartHomeKbArticle[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_articles")
    .select(ARTICLE_SELECT)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all((data ?? []).map((row) => rowToArticle(row as unknown as ArticleJoinRow, supabase)));
}

export async function fetchSmartHomeKbArticleBySlug(
  slug: string,
): Promise<SmartHomeKbArticle | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_articles")
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return rowToArticle(data as unknown as ArticleJoinRow, supabase);
}

async function syncArticleTags(
  supabase: SupabaseClientLike,
  articleId: string,
  tagIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("smart_home_kb_article_tags")
    .delete()
    .eq("article_id", articleId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (tagIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("smart_home_kb_article_tags")
    .insert(tagIds.map((tagId) => ({ article_id: articleId, tag_id: tagId })));
  if (insertError) {
    throw new Error(insertError.message);
  }
}

export type SmartHomeKbArticleInput = {
  title: string;
  summary: string;
  contextHtml: string;
  steps: SmartHomeKbArticleStep[];
  tipsHtml: string;
  categoryId: string | null;
  youtubeUrl: string | null;
  status: SmartHomeKbStatus;
  tagIds: string[];
  createdByName: string;
};

export async function createSmartHomeKbArticle(
  input: SmartHomeKbArticleInput,
): Promise<SmartHomeKbArticle> {
  const supabase = getSupabase();
  const slug = await uniqueSlug(supabase, "smart_home_kb_articles", input.title);

  const { data, error } = await supabase
    .from("smart_home_kb_articles")
    .insert({
      slug,
      title: input.title.trim(),
      summary: input.summary.trim(),
      context_html: input.contextHtml,
      steps: input.steps,
      tips_html: input.tipsHtml,
      category_id: input.categoryId,
      youtube_url: input.youtubeUrl?.trim() || null,
      status: input.status,
      created_by_name: input.createdByName.trim() || "Zespół",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const articleId = (data as { id: string }).id;
  await syncArticleTags(supabase, articleId, input.tagIds);

  const created = await fetchSmartHomeKbArticleBySlug(slug);
  if (!created) {
    throw new Error("Nie udało się odczytać utworzonego artykułu.");
  }
  await syncArticleKnowledgeMirror(supabase, created);
  return created;
}

export async function updateSmartHomeKbArticle(
  id: string,
  input: SmartHomeKbArticleInput,
): Promise<SmartHomeKbArticle> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("smart_home_kb_articles")
    .update({
      title: input.title.trim(),
      summary: input.summary.trim(),
      context_html: input.contextHtml,
      steps: input.steps,
      tips_html: input.tipsHtml,
      category_id: input.categoryId,
      youtube_url: input.youtubeUrl?.trim() || null,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await syncArticleTags(supabase, id, input.tagIds);

  const updated = await fetchSmartHomeKbArticleBySlug((data as { slug: string }).slug);
  if (!updated) {
    throw new Error("Nie udało się odczytać zaktualizowanego artykułu.");
  }
  await syncArticleKnowledgeMirror(supabase, updated);
  return updated;
}

export async function deleteSmartHomeKbArticle(id: string): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("smart_home_kb_articles")
    .select("cover_image_storage_path, smart_home_kb_article_media(storage_path)")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { error } = await supabase.from("smart_home_kb_articles").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  await removeKnowledgeSourceMirror(supabase, id);

  const row = existing as {
    cover_image_storage_path: string | null;
    smart_home_kb_article_media: { storage_path: string }[] | null;
  } | null;

  const paths = [
    ...(row?.cover_image_storage_path ? [row.cover_image_storage_path] : []),
    ...(row?.smart_home_kb_article_media ?? []).map((item) => item.storage_path),
  ];
  if (paths.length > 0) {
    await supabase.storage.from(SMART_HOME_KB_BUCKET).remove(paths);
  }
}

function extensionForImageFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) {
    return fromName;
  }
  return file.type.split("/")[1] || "jpg";
}

function validateImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Można dodawać tylko zdjęcia.");
  }
  if (file.size > SMART_HOME_KB_MAX_FILE_SIZE_BYTES) {
    throw new Error("Zdjęcie jest zbyt duże (limit 10 MB).");
  }
}

export async function uploadSmartHomeKbCoverImage(
  articleId: string,
  file: File,
): Promise<{ storagePath: string; url: string | null }> {
  validateImageFile(file);
  const supabase = getSupabase();
  const extension = extensionForImageFile(file);
  const storagePath = `${articleId}/cover-${crypto.randomUUID()}.${extension}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(SMART_HOME_KB_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error } = await supabase
    .from("smart_home_kb_articles")
    .update({ cover_image_storage_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", articleId);
  if (error) {
    await supabase.storage.from(SMART_HOME_KB_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const signedUrls = await signStoragePaths(supabase, [storagePath]);
  return { storagePath, url: signedUrls.get(storagePath) ?? null };
}

export async function addSmartHomeKbArticleMedia(
  articleId: string,
  file: File,
): Promise<SmartHomeKbArticleMedia> {
  validateImageFile(file);
  const supabase = getSupabase();
  const extension = extensionForImageFile(file);
  const storagePath = `${articleId}/${crypto.randomUUID()}.${extension}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(SMART_HOME_KB_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: lastMedia } = await supabase
    .from("smart_home_kb_article_media")
    .select("sort_order")
    .eq("article_id", articleId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("smart_home_kb_article_media")
    .insert({
      article_id: articleId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      sort_order: (typeof lastMedia?.sort_order === "number" ? lastMedia.sort_order : -1) + 1,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(SMART_HOME_KB_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  const signedUrls = await signStoragePaths(supabase, [storagePath]);
  const media = rowToMedia(data as SmartHomeKbArticleMediaRow);
  return { ...media, url: signedUrls.get(storagePath) ?? null };
}

export async function deleteSmartHomeKbArticleMedia(mediaId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("smart_home_kb_article_media")
    .select("storage_path")
    .eq("id", mediaId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { error } = await supabase.from("smart_home_kb_article_media").delete().eq("id", mediaId);
  if (error) {
    throw new Error(error.message);
  }

  const storagePath = (existing as { storage_path?: string } | null)?.storage_path;
  if (storagePath) {
    await supabase.storage.from(SMART_HOME_KB_BUCKET).remove([storagePath]);
  }
}

export async function fetchSmartHomeKbFaqItems(): Promise<SmartHomeKbFaqItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_faq_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToFaqItem(row as SmartHomeKbFaqItemRow));
}

export type SmartHomeKbFaqInput = {
  question: string;
  answerHtml: string;
  categoryId: string | null;
  status: SmartHomeKbStatus;
};

export async function createSmartHomeKbFaqItem(
  input: SmartHomeKbFaqInput,
): Promise<SmartHomeKbFaqItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_faq_items")
    .insert({
      question: input.question.trim(),
      answer_html: input.answerHtml,
      category_id: input.categoryId,
      status: input.status,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  const faq = rowToFaqItem(data as SmartHomeKbFaqItemRow);
  await syncFaqKnowledgeMirror(supabase, faq);
  return faq;
}

export async function updateSmartHomeKbFaqItem(
  id: string,
  input: SmartHomeKbFaqInput,
): Promise<SmartHomeKbFaqItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("smart_home_kb_faq_items")
    .update({
      question: input.question.trim(),
      answer_html: input.answerHtml,
      category_id: input.categoryId,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  const faq = rowToFaqItem(data as SmartHomeKbFaqItemRow);
  await syncFaqKnowledgeMirror(supabase, faq);
  return faq;
}

export async function deleteSmartHomeKbFaqItem(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("smart_home_kb_faq_items").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  await removeKnowledgeSourceMirror(supabase, id);
}

export type SmartHomeKbSearchResult = {
  articles: SmartHomeKbArticle[];
  faqItems: SmartHomeKbFaqItem[];
};

/** Wyszukiwanie frazy: ILIKE po tytule/skrócie/treści artykułów i po pytaniu/odpowiedzi FAQ. */
export async function searchSmartHomeKnowledgeBase(query: string): Promise<SmartHomeKbSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    const [articles, faqItems] = await Promise.all([
      fetchSmartHomeKbArticles(),
      fetchSmartHomeKbFaqItems(),
    ]);
    return { articles, faqItems };
  }

  const supabase = getSupabase();
  const like = `%${trimmed.replace(/[%_]/g, (match) => `\\${match}`)}%`;

  const [articlesResult, faqResult, tagMatchResult] = await Promise.all([
    supabase
      .from("smart_home_kb_articles")
      .select(ARTICLE_SELECT)
      .or(`title.ilike.${like},summary.ilike.${like},body_html.ilike.${like}`)
      .order("sort_order", { ascending: true }),
    supabase
      .from("smart_home_kb_faq_items")
      .select("*")
      .or(`question.ilike.${like},answer_html.ilike.${like}`)
      .order("sort_order", { ascending: true }),
    supabase
      .from("smart_home_kb_tags")
      .select("id, smart_home_kb_article_tags(article_id)")
      .ilike("name", like),
  ]);

  if (articlesResult.error) {
    throw new Error(articlesResult.error.message);
  }
  if (faqResult.error) {
    throw new Error(faqResult.error.message);
  }

  const matchedByTagArticleIds = new Set<string>(
    ((tagMatchResult.data ?? []) as unknown as { smart_home_kb_article_tags: { article_id: string }[] }[]).flatMap(
      (tag) => tag.smart_home_kb_article_tags.map((link) => link.article_id),
    ),
  );

  const directArticleRows = (articlesResult.data ?? []) as unknown as ArticleJoinRow[];
  const directIds = new Set(directArticleRows.map((row) => row.id));
  const extraTagArticleIds = Array.from(matchedByTagArticleIds).filter((id) => !directIds.has(id));

  let extraArticleRows: ArticleJoinRow[] = [];
  if (extraTagArticleIds.length > 0) {
    const { data, error } = await supabase
      .from("smart_home_kb_articles")
      .select(ARTICLE_SELECT)
      .in("id", extraTagArticleIds);
    if (error) {
      throw new Error(error.message);
    }
    extraArticleRows = (data ?? []) as unknown as ArticleJoinRow[];
  }

  const articles = await Promise.all(
    [...directArticleRows, ...extraArticleRows].map((row) => rowToArticle(row, supabase)),
  );
  const faqItems = (faqResult.data ?? []).map((row) => rowToFaqItem(row as SmartHomeKbFaqItemRow));

  return { articles, faqItems };
}
