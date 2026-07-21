"use client";

import { create } from "zustand";
import {
  DEFAULT_FIELD_OPTIONS,
  normalizeFieldOptions,
  type FieldOptions,
} from "@/lib/field-options";
import {
  DEFAULT_PROJECTS_VIEW_FILTERS,
  type ProjectsViewFilters,
} from "@/lib/projects-view-filters";
import {
  createInterruption,
  createProject,
  deleteInterruptionRecord,
  deleteProjectRecord,
  fetchInterruptions,
  fetchProjects,
  updateInterruptionRecord,
  updateProjectRecord,
} from "@/lib/supabase/repository";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import { findStageByTitle } from "@/lib/process/stage-helpers";
import { useProcessStore } from "@/store/process-store";
import { projectToInput } from "@/lib/supabase/mappers";
import { computeWarrantyEndsAt } from "@/lib/project/warranty";
import {
  fetchProjectsViewFilters,
  saveProjectsViewFilters,
} from "@/lib/supabase/projects-view-filters-repository";
import {
  createClientRecord,
  deleteClientRecord,
  fetchClients,
  updateClientRecord,
} from "@/lib/supabase/client-repository";
import {
  createContactRecord,
  deleteContactRecord,
  fetchContacts,
  updateContactRecord,
} from "@/lib/supabase/contact-repository";
import {
  fetchFieldOptions,
  patchFieldOptions as patchFieldOptionsOnServer,
  saveFieldOptions,
} from "@/lib/supabase/settings-repository";
import { fetchProjectActivitySettings } from "@/lib/supabase/project-activity-settings-repository";
import {
  defaultProjectActivitySettings,
  type ProjectActivitySettings,
} from "@/lib/project-activity/settings";
import type { Contact, ContactInput } from "@/lib/contacts/types";
import { getActivityActor } from "@/lib/activity-log/actor";
import { clientActivityHref, projectActivityHref } from "@/lib/activity-log/hrefs";
import { formatPartyName } from "@/lib/party/display-name";
import { sortClientsByLastName, sortContactsByLastName } from "@/lib/sort/party-and-project";
import { logActivity } from "@/lib/supabase/activity-log-repository";
import type { Client, ClientInput } from "@/lib/service/types";
import type { Interruption, Project, ProjectInput } from "@/lib/types";

const PROJECTS_VIEW_FILTERS_SAVE_DELAY_MS = 400;
let projectsViewFiltersSaveTimer: ReturnType<typeof setTimeout> | null = null;

type AppState = {
  projects: Project[];
  clients: Client[];
  contacts: Contact[];
  interruptions: Interruption[];
  fieldOptions: FieldOptions;
  projectActivitySettings: ProjectActivitySettings;
  projectsViewFilters: ProjectsViewFilters;
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  setProjectActivitySettings: (settings: ProjectActivitySettings) => void;
  addProject: (project: ProjectInput) => Promise<void>;
  updateProject: (id: string, project: ProjectInput) => Promise<void>;
  setProjectStage: (projectId: string, stageTitle: string) => Promise<void>;
  patchProjectFields: (id: string, patch: Partial<Project>) => void;
  updateProjectWarrantySettings: (
    id: string,
    settings: { systemHandoverAt: string | null; warrantyDurationMonths: number | null },
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addInterruption: (interruption: Omit<Interruption, "id">) => Promise<void>;
  updateInterruption: (id: string, interruption: Omit<Interruption, "id">) => Promise<void>;
  deleteInterruption: (id: string) => Promise<void>;
  updateFieldOptions: (options: FieldOptions) => Promise<void>;
  /** Atomowy patch na świeżych danych z serwera (bez nadpisywania katalogu starą kopią). */
  patchFieldOptions: (mutator: (current: FieldOptions) => FieldOptions) => Promise<FieldOptions>;
  /** Odśwież katalog branż / firm z serwera (np. przy otwarciu formularza wykonawcy). */
  refreshFieldOptions: () => Promise<FieldOptions>;
  updateProjectsViewFilters: (filters: ProjectsViewFilters) => void;
  addClient: (input: ClientInput) => Promise<Client>;
  updateClient: (id: string, input: ClientInput) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addContact: (input: ContactInput) => Promise<Contact>;
  updateContact: (id: string, input: ContactInput) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  markContactHandled: (contactId: string) => Promise<Contact | null>;
  convertContactToClient: (contactId: string) => Promise<Client>;
};

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  clients: [],
  contacts: [],
  interruptions: [],
  fieldOptions: DEFAULT_FIELD_OPTIONS,
  projectActivitySettings: defaultProjectActivitySettings(),
  projectsViewFilters: DEFAULT_PROJECTS_VIEW_FILTERS,
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  error: null,

  setProjectActivitySettings: (settings) => {
    set({ projectActivitySettings: settings });
  },

  initialize: async () => {
    if (get().isInitialized || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const [
        projects,
        clients,
        contacts,
        interruptions,
        fieldOptions,
        projectsViewFilters,
        projectActivitySettings,
      ] = await Promise.all([
        fetchProjects(),
        fetchClients(),
        fetchContacts(),
        fetchInterruptions(),
        fetchFieldOptions(),
        fetchProjectsViewFilters(),
        fetchProjectActivitySettings(),
      ]);

      set({
        projects,
        clients,
        contacts,
        interruptions,
        fieldOptions,
        projectsViewFilters,
        projectActivitySettings,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać danych",
        isLoading: false,
      });
    }
  },

  addProject: async (project) => {
    set({ isSaving: true, error: null });

    try {
      const created = await createProject(project);
      const processStore = useProcessStore.getState();
      await processStore.ensureProjectProcess(created.id, created.type);
      const process = processStore.getProjectProcess(created.id);
      const template = process
        ? resolveAnchoredProcessTemplate(process, processStore.getTemplateByProjectType(created.type))
        : null;
      const stage =
        findStageByTitle(template, created.stage) ??
        template?.stages.slice().sort((left, right) => left.position - right.position)[0];

      if (stage) {
        await processStore.setActiveStage(created.id, stage.id);
      }

      const finalStage = stage?.title ?? created.stage;

      set((state) => ({
        projects: [{ ...created, stage: finalStage }, ...state.projects],
        isSaving: false,
        error: null,
      }));

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "created",
        entityType: "project",
        entityId: created.id,
        entityLabel: created.name,
        summary: "Dodał projekt",
        href: projectActivityHref(created.id),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się dodać projektu",
        isSaving: false,
      });
      throw error;
    }
  },

  setProjectStage: async (projectId, stageTitle) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) {
      throw new Error("Projekt nie istnieje");
    }

    const processStore = useProcessStore.getState();
    await processStore.ensureProjectProcess(projectId, project.type);
    const process = processStore.getProjectProcess(projectId);
    const template = process
      ? resolveAnchoredProcessTemplate(process, processStore.getTemplateByProjectType(project.type))
      : null;
    const stage = findStageByTitle(template, stageTitle);

    if (!stage) {
      throw new Error(`Brak etapu „${stageTitle}” w procesie tego projektu.`);
    }

    await processStore.setActiveStage(projectId, stage.id);
  },

  updateProject: async (id, project) => {
    const existing = get().projects.find((item) => item.id === id);

    if (!existing) {
      throw new Error("Projekt nie istnieje");
    }

    set({ isSaving: true, error: null });

    try {
      const stageChanged = project.stage !== existing.stage;
      const updated = await updateProjectRecord(id, project, existing);
      set((state) => ({
        projects: state.projects.map((item) => (item.id === id ? updated : item)),
        isSaving: false,
        error: null,
      }));

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "project",
        entityId: updated.id,
        entityLabel: updated.name,
        summary: "Zaktualizował projekt",
        href: projectActivityHref(updated.id),
      });

      if (stageChanged) {
        await get().setProjectStage(id, project.stage);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować projektu",
        isSaving: false,
      });
      throw error;
    }
  },

  patchProjectFields: (id, patch) => {
    set((state) => ({
      projects: state.projects.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  },

  updateProjectWarrantySettings: async (id, settings) => {
    const existing = get().projects.find((item) => item.id === id);
    if (!existing) {
      throw new Error("Projekt nie istnieje");
    }

    const systemHandoverAt = settings.systemHandoverAt || undefined;
    const warrantyDurationMonths = settings.warrantyDurationMonths ?? undefined;
    const warrantyEndsAt =
      computeWarrantyEndsAt(systemHandoverAt ?? null, warrantyDurationMonths ?? null) || undefined;

    await get().updateProject(id, {
      ...projectToInput(existing),
      systemHandoverAt,
      warrantyDurationMonths,
      warrantyEndsAt,
    });
  },

  deleteProject: async (id) => {
    set({ isSaving: true, error: null });

    try {
      const existing = get().projects.find((project) => project.id === id);
      await deleteProjectRecord(id);
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
        interruptions: state.interruptions.filter(
          (interruption) => interruption.projectId !== id,
        ),
        isSaving: false,
        error: null,
      }));

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "deleted",
        entityType: "project",
        entityId: id,
        entityLabel: existing?.name ?? id,
        summary: "Usunął projekt",
        href: "/projekty",
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć projektu",
        isSaving: false,
      });
      throw error;
    }
  },

  addInterruption: async (interruption) => {
    set({ isSaving: true, error: null });

    try {
      const created = await createInterruption(interruption);
      set((state) => ({
        interruptions: [created, ...state.interruptions],
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się dodać przerwania",
        isSaving: false,
      });
      throw error;
    }
  },

  updateInterruption: async (id, interruption) => {
    set({ isSaving: true, error: null });

    try {
      const updated = await updateInterruptionRecord(id, interruption);
      set((state) => ({
        interruptions: state.interruptions.map((item) => (item.id === id ? updated : item)),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować przerwania",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteInterruption: async (id) => {
    set({ isSaving: true, error: null });

    try {
      await deleteInterruptionRecord(id);
      set((state) => ({
        interruptions: state.interruptions.filter((item) => item.id !== id),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć przerwania",
        isSaving: false,
      });
      throw error;
    }
  },

  updateFieldOptions: async (options) => {
    set({ isSaving: true, error: null });

    try {
      const fieldOptions = await saveFieldOptions(normalizeFieldOptions(options));
      set({
        fieldOptions,
        isSaving: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień",
        isSaving: false,
      });
      throw error;
    }
  },

  patchFieldOptions: async (mutator) => {
    set({ isSaving: true, error: null });
    try {
      const fieldOptions = await patchFieldOptionsOnServer(mutator);
      set({
        fieldOptions,
        isSaving: false,
        error: null,
      });
      return fieldOptions;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień",
        isSaving: false,
      });
      throw error;
    }
  },

  refreshFieldOptions: async () => {
    const fieldOptions = await fetchFieldOptions();
    set({ fieldOptions });
    return fieldOptions;
  },

  updateProjectsViewFilters: (filters) => {
    set({ projectsViewFilters: filters, error: null });

    if (projectsViewFiltersSaveTimer) {
      clearTimeout(projectsViewFiltersSaveTimer);
    }

    projectsViewFiltersSaveTimer = setTimeout(async () => {
      set({ isSaving: true });

      try {
        const projectsViewFilters = await saveProjectsViewFilters(filters);
        set({
          projectsViewFilters,
          isSaving: false,
          error: null,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Nie udało się zapisać filtrów widoku",
          isSaving: false,
        });
      }
    }, PROJECTS_VIEW_FILTERS_SAVE_DELAY_MS);
  },

  addClient: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const created = await createClientRecord(input);
      set((state) => ({
        clients: sortClientsByLastName([...state.clients, created]),
        isSaving: false,
        error: null,
      }));

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "created",
        entityType: "client",
        entityId: created.id,
        entityLabel: formatPartyName(created),
        summary: "Dodał klienta",
        href: clientActivityHref(),
      });

      void fetch("/api/sms/dispatch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "client_created",
          context: {
            clientId: created.id,
            phone: created.phone,
            firstName: created.firstName,
            lastName: created.lastName,
            fullName: formatPartyName(created),
            email: created.email,
            location: created.location,
          },
        }),
      }).catch(() => undefined);

      return created;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się dodać klienta",
        isSaving: false,
      });
      throw error;
    }
  },

  updateClient: async (id, input) => {
    set({ isSaving: true, error: null });

    try {
      const updated = await updateClientRecord(id, input);
      set((state) => ({
        clients: sortClientsByLastName(
          state.clients.map((item) => (item.id === id ? updated : item)),
        ),
        isSaving: false,
        error: null,
      }));

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "updated",
        entityType: "client",
        entityId: updated.id,
        entityLabel: formatPartyName(updated),
        summary: "Zaktualizował klienta",
        href: clientActivityHref(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować klienta",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteClient: async (id) => {
    set({ isSaving: true, error: null });

    try {
      const existing = get().clients.find((item) => item.id === id);
      await deleteClientRecord(id);
      set((state) => ({
        clients: state.clients.filter((item) => item.id !== id),
        projects: state.projects.map((project) =>
          project.clientId === id ? { ...project, clientId: null } : project,
        ),
        isSaving: false,
        error: null,
      }));

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "deleted",
        entityType: "client",
        entityId: id,
        entityLabel: existing ? formatPartyName(existing) : id,
        summary: "Usunął klienta",
        href: clientActivityHref(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć klienta",
        isSaving: false,
      });
      throw error;
    }
  },

  addContact: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const created = await createContactRecord(input);
      set((state) => ({
        contacts: sortContactsByLastName([...state.contacts, created]),
        isSaving: false,
        error: null,
      }));
      return created;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się dodać kontaktu",
        isSaving: false,
      });
      throw error;
    }
  },

  updateContact: async (id, input) => {
    set({ isSaving: true, error: null });

    try {
      const updated = await updateContactRecord(id, input);
      set((state) => ({
        contacts: sortContactsByLastName(
          state.contacts.map((item) => (item.id === id ? updated : item)),
        ),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zaktualizować kontaktu",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteContact: async (id) => {
    set({ isSaving: true, error: null });

    try {
      await deleteContactRecord(id);
      set((state) => ({
        contacts: state.contacts.filter((item) => item.id !== id),
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć kontaktu",
        isSaving: false,
      });
      throw error;
    }
  },

  refreshContacts: async () => {
    try {
      const contacts = await fetchContacts();
      set({ contacts, error: null });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("contacts-count-changed"));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się odświeżyć kontaktów",
      });
    }
  },

  markContactHandled: async (contactId) => {
    const existing = get().contacts.find((item) => item.id === contactId);
    if (existing && (existing.handledAt || existing.convertedClientId)) {
      return existing;
    }

    try {
      const response = await fetch(`/api/contacts/${contactId}/handle`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się oznaczyć kontaktu jako obsłużony.");
      }

      const contact = payload.contact as Contact;
      set((state) => ({
        contacts: state.contacts.map((item) => (item.id === contact.id ? contact : item)),
        error: null,
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("contacts-count-changed"));
      }

      return contact;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Nie udało się oznaczyć kontaktu jako obsłużony",
      });
      throw error;
    }
  },

  convertContactToClient: async (contactId) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/contacts/${contactId}/convert`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się przekształcić kontaktu w klienta.");
      }

      const client = payload.client as Client;
      const contact = payload.contact as Contact;

      set((state) => ({
        clients: sortClientsByLastName([
          ...state.clients.filter((item) => item.id !== client.id),
          client,
        ]),
        contacts: sortContactsByLastName(
          state.contacts.map((item) => (item.id === contact.id ? contact : item)),
        ),
        isSaving: false,
        error: null,
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("contacts-count-changed"));
      }

      return client;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Nie udało się przekształcić kontaktu w klienta",
        isSaving: false,
      });
      throw error;
    }
  },
}));
