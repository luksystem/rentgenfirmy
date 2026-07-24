"use client";

import { create } from "zustand";
import type { SmartHomeKbClientPath, SmartHomeKbPathTemplate } from "@/lib/smart-home-kb/types";
import {
  createSmartHomeKbClientPath,
  createSmartHomeKbClientPathFromTemplate,
  createSmartHomeKbPathTemplate,
  deleteSmartHomeKbClientPath,
  deleteSmartHomeKbPathTemplate,
  fetchClientAccountProfiles,
  fetchSmartHomeKbClientPaths,
  fetchSmartHomeKbPathTemplates,
  linkClientAccountToClient,
  renameSmartHomeKbClientPath,
  setSmartHomeKbClientPathArticles,
  setSmartHomeKbClientPathItemCompleted,
  setSmartHomeKbPathTemplateArticles,
  unlinkClientAccountFromClient,
} from "@/lib/supabase/smart-home-kb-paths-repository";

type ClientAccountProfile = { id: string; name: string; email: string; clientId: string | null };

type SmartHomeKbPathsStore = {
  templates: SmartHomeKbPathTemplate[];
  templatesHydrated: boolean;
  clientAccountProfiles: ClientAccountProfile[];
  clientAccountProfilesHydrated: boolean;
  clientPathsByClientId: Record<string, SmartHomeKbClientPath[]>;
  isLoading: boolean;
  error: string | null;

  ensureTemplates: () => Promise<void>;
  ensureClientAccountProfiles: () => Promise<void>;
  ensureClientPaths: (clientId: string) => Promise<void>;

  createTemplate: (input: { name: string; description?: string }) => Promise<SmartHomeKbPathTemplate>;
  removeTemplate: (id: string) => Promise<void>;
  setTemplateArticles: (templateId: string, articleIds: string[]) => Promise<void>;

  createClientPath: (input: {
    clientId: string;
    name: string;
    description?: string;
    articleIds: string[];
  }) => Promise<SmartHomeKbClientPath>;
  createClientPathFromTemplate: (clientId: string, templateId: string) => Promise<void>;
  renameClientPath: (
    clientId: string,
    pathId: string,
    input: { name: string; description?: string },
  ) => Promise<void>;
  removeClientPath: (clientId: string, pathId: string) => Promise<void>;
  setClientPathArticles: (clientId: string, pathId: string, articleIds: string[]) => Promise<void>;
  toggleClientPathItemCompleted: (
    clientId: string,
    pathId: string,
    itemId: string,
    completed: boolean,
  ) => Promise<void>;

  linkClientAccount: (profileId: string, clientId: string) => Promise<void>;
  unlinkClientAccount: (profileId: string) => Promise<void>;
};

export const useSmartHomeKbPathsStore = create<SmartHomeKbPathsStore>((set, get) => ({
  templates: [],
  templatesHydrated: false,
  clientAccountProfiles: [],
  clientAccountProfilesHydrated: false,
  clientPathsByClientId: {},
  isLoading: false,
  error: null,

  ensureTemplates: async () => {
    if (get().templatesHydrated) {
      return;
    }
    try {
      const templates = await fetchSmartHomeKbPathTemplates();
      set({ templates, templatesHydrated: true });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Nie udało się wczytać szablonów." });
    }
  },

  ensureClientAccountProfiles: async () => {
    if (get().clientAccountProfilesHydrated) {
      return;
    }
    try {
      const profiles = await fetchClientAccountProfiles();
      set({ clientAccountProfiles: profiles, clientAccountProfilesHydrated: true });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Nie udało się wczytać kont klientów." });
    }
  },

  ensureClientPaths: async (clientId) => {
    if (get().clientPathsByClientId[clientId]) {
      return;
    }
    try {
      const paths = await fetchSmartHomeKbClientPaths(clientId);
      set((state) => ({ clientPathsByClientId: { ...state.clientPathsByClientId, [clientId]: paths } }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Nie udało się wczytać ścieżek klienta." });
    }
  },

  createTemplate: async (input) => {
    const template = await createSmartHomeKbPathTemplate(input);
    set((state) => ({ templates: [...state.templates, template].sort((a, b) => a.name.localeCompare(b.name)) }));
    return template;
  },

  removeTemplate: async (id) => {
    await deleteSmartHomeKbPathTemplate(id);
    set((state) => ({ templates: state.templates.filter((item) => item.id !== id) }));
  },

  setTemplateArticles: async (templateId, articleIds) => {
    const items = await setSmartHomeKbPathTemplateArticles(templateId, articleIds);
    set((state) => ({
      templates: state.templates.map((template) => (template.id === templateId ? { ...template, items } : template)),
    }));
  },

  createClientPath: async (input) => {
    const path = await createSmartHomeKbClientPath(input);
    set((state) => ({
      clientPathsByClientId: {
        ...state.clientPathsByClientId,
        [input.clientId]: [...(state.clientPathsByClientId[input.clientId] ?? []), path],
      },
    }));
    return path;
  },

  createClientPathFromTemplate: async (clientId, templateId) => {
    const template = get().templates.find((item) => item.id === templateId);
    if (!template) {
      throw new Error("Nie znaleziono szablonu.");
    }
    const path = await createSmartHomeKbClientPathFromTemplate(clientId, template);
    set((state) => ({
      clientPathsByClientId: {
        ...state.clientPathsByClientId,
        [clientId]: [...(state.clientPathsByClientId[clientId] ?? []), path],
      },
    }));
  },

  renameClientPath: async (clientId, pathId, input) => {
    await renameSmartHomeKbClientPath(pathId, input);
    set((state) => ({
      clientPathsByClientId: {
        ...state.clientPathsByClientId,
        [clientId]: (state.clientPathsByClientId[clientId] ?? []).map((path) =>
          path.id === pathId ? { ...path, name: input.name, description: input.description ?? path.description } : path,
        ),
      },
    }));
  },

  removeClientPath: async (clientId, pathId) => {
    await deleteSmartHomeKbClientPath(pathId);
    set((state) => ({
      clientPathsByClientId: {
        ...state.clientPathsByClientId,
        [clientId]: (state.clientPathsByClientId[clientId] ?? []).filter((path) => path.id !== pathId),
      },
    }));
  },

  setClientPathArticles: async (clientId, pathId, articleIds) => {
    const items = await setSmartHomeKbClientPathArticles(pathId, articleIds);
    set((state) => ({
      clientPathsByClientId: {
        ...state.clientPathsByClientId,
        [clientId]: (state.clientPathsByClientId[clientId] ?? []).map((path) =>
          path.id === pathId ? { ...path, items } : path,
        ),
      },
    }));
  },

  toggleClientPathItemCompleted: async (clientId, pathId, itemId, completed) => {
    await setSmartHomeKbClientPathItemCompleted(itemId, completed);
    set((state) => ({
      clientPathsByClientId: {
        ...state.clientPathsByClientId,
        [clientId]: (state.clientPathsByClientId[clientId] ?? []).map((path) =>
          path.id === pathId
            ? {
                ...path,
                items: path.items.map((item) =>
                  item.id === itemId
                    ? { ...item, completedAt: completed ? new Date().toISOString() : null }
                    : item,
                ),
              }
            : path,
        ),
      },
    }));
  },

  linkClientAccount: async (profileId, clientId) => {
    await linkClientAccountToClient(profileId, clientId);
    set((state) => ({
      clientAccountProfiles: state.clientAccountProfiles.map((profile) =>
        profile.id === profileId ? { ...profile, clientId } : profile,
      ),
    }));
  },

  unlinkClientAccount: async (profileId) => {
    await unlinkClientAccountFromClient(profileId);
    set((state) => ({
      clientAccountProfiles: state.clientAccountProfiles.map((profile) =>
        profile.id === profileId ? { ...profile, clientId: null } : profile,
      ),
    }));
  },
}));
