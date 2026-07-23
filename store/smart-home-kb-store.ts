"use client";

import { create } from "zustand";
import type {
  SmartHomeKbArticle,
  SmartHomeKbCategory,
  SmartHomeKbFaqItem,
  SmartHomeKbTag,
} from "@/lib/smart-home-kb/types";
import {
  addSmartHomeKbArticleMedia,
  createSmartHomeKbArticle,
  createSmartHomeKbCategory,
  createSmartHomeKbFaqItem,
  deleteSmartHomeKbArticle,
  deleteSmartHomeKbArticleMedia,
  deleteSmartHomeKbCategory,
  deleteSmartHomeKbFaqItem,
  deleteSmartHomeKbTag,
  fetchSmartHomeKbArticles,
  fetchSmartHomeKbCategories,
  fetchSmartHomeKbFaqItems,
  fetchSmartHomeKbTags,
  findOrCreateSmartHomeKbTag,
  renameSmartHomeKbTag,
  searchSmartHomeKnowledgeBase,
  updateSmartHomeKbArticle,
  updateSmartHomeKbCategory,
  updateSmartHomeKbFaqItem,
  uploadSmartHomeKbCoverImage,
  type SmartHomeKbArticleInput,
  type SmartHomeKbFaqInput,
} from "@/lib/supabase/smart-home-kb-repository";

type SmartHomeKbStore = {
  categories: SmartHomeKbCategory[];
  tags: SmartHomeKbTag[];
  articles: SmartHomeKbArticle[];
  faqItems: SmartHomeKbFaqItem[];
  hydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  ensure: (options?: { force?: boolean }) => Promise<void>;
  search: (query: string) => Promise<void>;

  createCategory: (input: { name: string; description?: string }) => Promise<SmartHomeKbCategory>;
  updateCategory: (
    id: string,
    input: { name: string; description?: string },
  ) => Promise<SmartHomeKbCategory>;
  removeCategory: (id: string) => Promise<void>;

  ensureTag: (name: string) => Promise<SmartHomeKbTag>;
  renameTag: (id: string, name: string) => Promise<void>;
  removeTag: (id: string) => Promise<void>;

  createArticle: (input: SmartHomeKbArticleInput) => Promise<SmartHomeKbArticle>;
  updateArticle: (id: string, input: SmartHomeKbArticleInput) => Promise<SmartHomeKbArticle>;
  removeArticle: (id: string) => Promise<void>;
  uploadArticleCover: (articleId: string, file: File) => Promise<void>;
  addArticleMedia: (articleId: string, file: File) => Promise<void>;
  removeArticleMedia: (articleId: string, mediaId: string) => Promise<void>;

  createFaqItem: (input: SmartHomeKbFaqInput) => Promise<SmartHomeKbFaqItem>;
  updateFaqItem: (id: string, input: SmartHomeKbFaqInput) => Promise<SmartHomeKbFaqItem>;
  removeFaqItem: (id: string) => Promise<void>;
};

let inFlightEnsure: Promise<void> | null = null;

function replaceArticle(articles: SmartHomeKbArticle[], next: SmartHomeKbArticle) {
  const exists = articles.some((item) => item.id === next.id);
  return exists
    ? articles.map((item) => (item.id === next.id ? next : item))
    : [...articles, next].sort((a, b) => a.sortOrder - b.sortOrder);
}

export const useSmartHomeKbStore = create<SmartHomeKbStore>((set, get) => ({
  categories: [],
  tags: [],
  articles: [],
  faqItems: [],
  hydrated: false,
  isLoading: false,
  isSaving: false,
  error: null,

  ensure: async (options) => {
    const force = options?.force ?? false;
    if (!force && get().hydrated) {
      return;
    }
    if (inFlightEnsure) {
      return inFlightEnsure;
    }

    set({ isLoading: !get().hydrated, error: null });

    inFlightEnsure = (async () => {
      try {
        const [categories, tags, articles, faqItems] = await Promise.all([
          fetchSmartHomeKbCategories(),
          fetchSmartHomeKbTags(),
          fetchSmartHomeKbArticles(),
          fetchSmartHomeKbFaqItems(),
        ]);
        set({ categories, tags, articles, faqItems, hydrated: true, isLoading: false, error: null });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Nie udało się wczytać bazy wiedzy.",
          isLoading: false,
        });
      } finally {
        inFlightEnsure = null;
      }
    })();

    return inFlightEnsure;
  },

  search: async (query) => {
    set({ isLoading: true, error: null });
    try {
      const result = await searchSmartHomeKnowledgeBase(query);
      set({ articles: result.articles, faqItems: result.faqItems, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Wyszukiwanie się nie powiodło.",
        isLoading: false,
      });
    }
  },

  createCategory: async (input) => {
    const category = await createSmartHomeKbCategory(input);
    set((state) => ({ categories: [...state.categories, category].sort((a, b) => a.sortOrder - b.sortOrder) }));
    return category;
  },

  updateCategory: async (id, input) => {
    const category = await updateSmartHomeKbCategory(id, input);
    set((state) => ({
      categories: state.categories.map((item) => (item.id === id ? category : item)),
    }));
    return category;
  },

  removeCategory: async (id) => {
    await deleteSmartHomeKbCategory(id);
    set((state) => ({
      categories: state.categories.filter((item) => item.id !== id),
      articles: state.articles.map((article) =>
        article.categoryId === id ? { ...article, categoryId: null } : article,
      ),
      faqItems: state.faqItems.map((faq) => (faq.categoryId === id ? { ...faq, categoryId: null } : faq)),
    }));
  },

  ensureTag: async (name) => {
    const tag = await findOrCreateSmartHomeKbTag(name);
    set((state) =>
      state.tags.some((item) => item.id === tag.id)
        ? state
        : { tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) },
    );
    return tag;
  },

  renameTag: async (id, name) => {
    const tag = await renameSmartHomeKbTag(id, name);
    set((state) => ({ tags: state.tags.map((item) => (item.id === id ? tag : item)) }));
  },

  removeTag: async (id) => {
    await deleteSmartHomeKbTag(id);
    set((state) => ({
      tags: state.tags.filter((item) => item.id !== id),
      articles: state.articles.map((article) => ({
        ...article,
        tagIds: article.tagIds.filter((tagId) => tagId !== id),
      })),
    }));
  },

  createArticle: async (input) => {
    set({ isSaving: true, error: null });
    try {
      const article = await createSmartHomeKbArticle(input);
      set((state) => ({ articles: replaceArticle(state.articles, article), isSaving: false }));
      return article;
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : "Nie udało się zapisać artykułu." });
      throw error;
    }
  },

  updateArticle: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      const article = await updateSmartHomeKbArticle(id, input);
      set((state) => ({ articles: replaceArticle(state.articles, article), isSaving: false }));
      return article;
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : "Nie udało się zapisać artykułu." });
      throw error;
    }
  },

  removeArticle: async (id) => {
    await deleteSmartHomeKbArticle(id);
    set((state) => ({ articles: state.articles.filter((item) => item.id !== id) }));
  },

  uploadArticleCover: async (articleId, file) => {
    const { storagePath, url } = await uploadSmartHomeKbCoverImage(articleId, file);
    set((state) => ({
      articles: state.articles.map((article) =>
        article.id === articleId
          ? { ...article, coverImageStoragePath: storagePath, coverImageUrl: url }
          : article,
      ),
    }));
  },

  addArticleMedia: async (articleId, file) => {
    const media = await addSmartHomeKbArticleMedia(articleId, file);
    set((state) => ({
      articles: state.articles.map((article) =>
        article.id === articleId ? { ...article, media: [...article.media, media] } : article,
      ),
    }));
  },

  removeArticleMedia: async (articleId, mediaId) => {
    await deleteSmartHomeKbArticleMedia(mediaId);
    set((state) => ({
      articles: state.articles.map((article) =>
        article.id === articleId
          ? { ...article, media: article.media.filter((item) => item.id !== mediaId) }
          : article,
      ),
    }));
  },

  createFaqItem: async (input) => {
    const faq = await createSmartHomeKbFaqItem(input);
    set((state) => ({ faqItems: [...state.faqItems, faq].sort((a, b) => a.sortOrder - b.sortOrder) }));
    return faq;
  },

  updateFaqItem: async (id, input) => {
    const faq = await updateSmartHomeKbFaqItem(id, input);
    set((state) => ({ faqItems: state.faqItems.map((item) => (item.id === id ? faq : item)) }));
    return faq;
  },

  removeFaqItem: async (id) => {
    await deleteSmartHomeKbFaqItem(id);
    set((state) => ({ faqItems: state.faqItems.filter((item) => item.id !== id) }));
  },
}));
