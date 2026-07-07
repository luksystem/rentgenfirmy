"use client";

import { create } from "zustand";
import {
  DEFAULT_KNOWLEDGE_BASE_SETTINGS,
  type KnowledgeBaseSettings,
} from "@/lib/knowledge/settings";
import type { KnowledgeSource } from "@/lib/knowledge/types";
import {
  createKnowledgeSourceFromFile,
  createKnowledgeSourceFromText,
  createKnowledgeSourceFromUrl,
  deleteKnowledgeSource,
  fetchKnowledgeBaseSettings,
  fetchKnowledgeSources,
  markKnowledgeSourcePending,
  saveKnowledgeBaseSettings,
} from "@/lib/supabase/knowledge-repository";

type KnowledgeStore = {
  sources: KnowledgeSource[];
  settings: KnowledgeBaseSettings;
  hydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  ensure: (options?: { force?: boolean }) => Promise<void>;
  addFileSource: (input: {
    type: "pdf" | "text" | "whatsapp" | "image";
    title: string;
    description?: string;
    file: File;
    createdByName: string;
  }) => Promise<KnowledgeSource>;
  addNoteSource: (input: {
    title: string;
    description?: string;
    content: string;
    createdByName: string;
  }) => Promise<KnowledgeSource>;
  addUrlSource: (input: {
    type: "link" | "youtube";
    title: string;
    description?: string;
    url: string;
    createdByName: string;
  }) => Promise<KnowledgeSource>;
  removeSource: (sourceId: string) => Promise<void>;
  retrySource: (sourceId: string) => Promise<void>;
  processSource: (sourceId: string) => Promise<void>;
  updateSettings: (settings: KnowledgeBaseSettings) => Promise<void>;
};

let inFlightEnsure: Promise<void> | null = null;

async function triggerProcessing(sourceId: string) {
  const response = await fetch("/api/knowledge/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Nie udało się przetworzyć źródła.");
  }
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  sources: [],
  settings: DEFAULT_KNOWLEDGE_BASE_SETTINGS,
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
        const [sources, settings] = await Promise.all([
          fetchKnowledgeSources(),
          fetchKnowledgeBaseSettings(),
        ]);
        set({ sources, settings, hydrated: true, isLoading: false, error: null });
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

  addFileSource: async (input) => {
    const source = await createKnowledgeSourceFromFile(input);
    set((state) => ({ sources: [source, ...state.sources] }));
    void get().processSource(source.id);
    return source;
  },

  addUrlSource: async (input) => {
    const source = await createKnowledgeSourceFromUrl(input);
    set((state) => ({ sources: [source, ...state.sources] }));
    void get().processSource(source.id);
    return source;
  },

  addNoteSource: async (input) => {
    const source = await createKnowledgeSourceFromText(input);
    set((state) => ({ sources: [source, ...state.sources] }));
    return source;
  },

  removeSource: async (sourceId) => {
    await deleteKnowledgeSource(sourceId);
    set((state) => ({ sources: state.sources.filter((item) => item.id !== sourceId) }));
  },

  retrySource: async (sourceId) => {
    await markKnowledgeSourcePending(sourceId);
    set((state) => ({
      sources: state.sources.map((item) =>
        item.id === sourceId ? { ...item, status: "pending", errorMessage: null } : item,
      ),
    }));
    void get().processSource(sourceId);
  },

  processSource: async (sourceId) => {
    set((state) => ({
      sources: state.sources.map((item) =>
        item.id === sourceId ? { ...item, status: "processing" } : item,
      ),
    }));

    try {
      await triggerProcessing(sourceId);
    } catch (error) {
      set((state) => ({
        sources: state.sources.map((item) =>
          item.id === sourceId
            ? {
                ...item,
                status: "error",
                errorMessage: error instanceof Error ? error.message : "Błąd przetwarzania.",
              }
            : item,
        ),
      }));
      return;
    }

    try {
      const sources = await fetchKnowledgeSources();
      set({ sources });
    } catch {
      // Odświeżenie listy się nie powiodło — status ustawiony przez route pozostaje niewidoczny
      // do najbliższego ręcznego odświeżenia; nie blokujemy przez to reszty UI.
    }
  },

  updateSettings: async (settings) => {
    set({ isSaving: true, error: null });
    try {
      const saved = await saveKnowledgeBaseSettings(settings);
      set({ settings: saved, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień.",
        isSaving: false,
      });
      throw error;
    }
  },
}));
