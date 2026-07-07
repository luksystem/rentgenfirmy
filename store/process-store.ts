"use client";

import { create } from "zustand";
import type { UserProfile } from "@/lib/auth/types";
import { getUserDisplayName } from "@/lib/auth/types";
import type {
  ChecklistItemPayload,
  ProcessElement,
  ProcessElementPayload,
  ProcessItemKind,
  ProcessItemLink,
  ProcessTemplate,
  ProjectProcess,
  ProjectProcessItem,
} from "@/lib/process/types";
import { getProcessProgress } from "@/lib/process/types";
import type { ProjectMeetingNote, ProjectMeetingNoteInput } from "@/lib/dashboard/meeting-note-types";
import { createProjectMeetingNote } from "@/lib/supabase/project-meeting-note-repository";
import type {
  ProjectProcessProtocol,
  ProtocolField,
  ProtocolFieldValue,
  ProtocolOverlayItem,
  ProtocolSignature,
  ProtocolTemplate,
  ProtocolTemplateSource,
} from "@/lib/process/protocol-types";
import {
  fetchProcessItemLinksForItems,
  linkDocumentToProcessItem,
  linkMeetingNoteToProcessItem,
  unlinkProcessItemLink,
} from "@/lib/supabase/process-item-link-repository";
import {
  acceptProtocol as acceptProtocolRepo,
  assignProtocolTemplateToItem,
  clearProtocolSignature as clearProtocolSignatureRepo,
  createProtocolTemplate as createProtocolTemplateRepo,
  deleteProtocolTemplate,
  fetchOrCreateProjectProcessProtocol,
  fetchProtocolTemplates,
  saveProtocolAnnotation as saveProtocolAnnotationRepo,
  saveProtocolFieldValues as saveProtocolFieldValuesRepo,
  saveProtocolOverlayItems as saveProtocolOverlayItemsRepo,
  saveProtocolTemplate as saveProtocolTemplateRepo,
  signProtocolAsClient,
  signProtocolAsCompany,
  unacceptProtocol as unacceptProtocolRepo,
} from "@/lib/supabase/process-protocol-repository";
import {
  assignProjectProcessItem,
  ensureProjectProcessItems,
  mapProjectProcessItemsByTemplateId,
  saveProjectProcessItemChecklist,
  setProjectProcessItemBlocksNextStage,
  signProjectProcessItem,
} from "@/lib/supabase/process-item-repository";
import {
  createProcessElement,
  deleteProcessElement,
  fetchProcessElements,
  saveProcessElement,
} from "@/lib/supabase/process-element-repository";
import { countNewKanbanTasksForTeam, countOverdueKanbanTasks } from "@/lib/supabase/kanban-repository";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import {
  addProjectProcessSnapshotItem,
  ensureDefaultProcessTemplates,
  ensureAnchoredTemplateSnapshot,
  ensureProcessTemplateForProjectType,
  fetchProcessTemplates,
  fetchProjectProcess,
  fetchProjectProcesses,
  getOrCreateProjectProcess,
  removeProjectProcessSnapshotItem,
  saveProcessTemplate,
  updateProjectProcessActiveStage,
  updateProjectProcessCompletion,
  updateProjectProcessMilestoneDate,
} from "@/lib/supabase/process-repository";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";

const noteLinksLoadPromises = new Map<string, Promise<void>>();
let protocolTemplatesLoadPromise: Promise<void> | null = null;
const projectProtocolLoadPromises = new Map<string, Promise<void>>();

type ProcessStore = {
  templates: ProcessTemplate[];
  elements: ProcessElement[];
  kanbanNewTaskCount: number;
  kanbanOverdueTaskCount: number;
  projectProcesses: Record<string, ProjectProcess>;
  projectProcessItems: Record<string, Record<string, ProjectProcessItem>>;
  /** projectId → projectProcessItemId (DB id) → podpięte notatki/dokumenty. */
  noteLinksByProject: Record<string, Record<string, ProcessItemLink[]>>;
  protocolTemplates: ProtocolTemplate[];
  protocolTemplatesHydrated: boolean;
  /** projectProcessItemId (DB id) → wypełniony protokół projektu. */
  projectProtocols: Record<string, ProjectProcessProtocol>;
  teamProfiles: UserProfile[];
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: (projectTypes: string[]) => Promise<void>;
  refresh: (projectTypes: string[]) => Promise<void>;
  getTemplateByProjectType: (projectType: string) => ProcessTemplate | undefined;
  getProjectProcess: (projectId: string) => ProjectProcess | undefined;
  getProjectProcessItem: (projectId: string, templateItemId: string) => ProjectProcessItem | undefined;
  getProjectProgress: (projectId: string, projectType: string) => { completed: number; total: number; percent: number } | null;
  ensureProjectProcess: (projectId: string, projectType: string) => Promise<ProjectProcess>;
  ensureProjectProcessItems: (projectId: string, template: ProcessTemplate) => Promise<void>;
  loadProjectProcessItems: (projectId: string) => Promise<void>;
  syncProjectProcessFromTemplate: (
    projectId: string,
    projectType: string,
  ) => Promise<ProjectProcess>;
  applyProjectProcessSync: (
    projectId: string,
    process: ProjectProcess,
    itemsByTemplateId: Record<string, ProjectProcessItem>,
  ) => void;
  loadTeamProfiles: () => Promise<void>;
  ensureTemplateForProjectType: (projectType: string) => Promise<ProcessTemplate>;
  saveTemplate: (template: ProcessTemplate) => Promise<void>;
  saveChecklistPayload: (
    projectId: string,
    templateItemId: string,
    payload: ChecklistItemPayload,
    actorName?: string,
  ) => Promise<void>;
  assignProcessItem: (
    projectId: string,
    templateItemId: string,
    assigneeId: string | null,
  ) => Promise<void>;
  signProcessItem: (
    projectId: string,
    templateItemId: string,
    signer: { id: string; name: string },
    signatureNote?: string,
  ) => Promise<void>;
  toggleItemCompletion: (
    projectId: string,
    itemId: string,
    completed: boolean,
    completedBy?: string,
  ) => Promise<void>;
  saveMilestoneDate: (
    projectId: string,
    milestoneId: string,
    plannedDate: string | null,
  ) => Promise<void>;
  setItemBlocksNextStage: (
    projectId: string,
    templateItemId: string,
    blocksNextStage: boolean,
  ) => Promise<void>;
  setActiveStage: (projectId: string, stageId: string | null) => Promise<void>;
  addProjectProcessItem: (
    projectId: string,
    milestoneId: string,
    input: { title: string; kind: ProcessItemKind },
  ) => Promise<void>;
  removeProjectProcessItem: (projectId: string, itemId: string) => Promise<void>;
  ensureProtocolTemplates: (options?: { force?: boolean }) => Promise<void>;
  createProtocolTemplate: (input: {
    name: string;
    description?: string;
    source: ProtocolTemplateSource;
    fields: ProtocolField[];
    projectType?: string | null;
    referenceFile?: File | null;
  }) => Promise<ProtocolTemplate>;
  saveProtocolTemplate: (template: ProtocolTemplate, replaceReferenceFile?: File | null) => Promise<void>;
  removeProtocolTemplate: (id: string) => Promise<void>;
  ensureProjectProtocol: (
    projectProcessItemId: string,
    options?: { force?: boolean },
  ) => Promise<ProjectProcessProtocol>;
  chooseProtocolTemplateForItem: (
    projectProcessItemId: string,
    protocolTemplateId: string | null,
  ) => Promise<void>;
  saveProtocolFieldValues: (
    projectProcessItemId: string,
    fieldValues: Record<string, ProtocolFieldValue>,
    notes?: string,
  ) => Promise<void>;
  signProtocolCompany: (projectProcessItemId: string, signature: ProtocolSignature) => Promise<void>;
  signProtocolClient: (projectProcessItemId: string, signature: ProtocolSignature) => Promise<void>;
  clearProtocolSignature: (
    projectProcessItemId: string,
    which: "company" | "client",
  ) => Promise<void>;
  saveProtocolAnnotation: (
    projectProcessItemId: string,
    page: number,
    dataUrl: string | null,
  ) => Promise<void>;
  saveProtocolOverlayItems: (
    projectProcessItemId: string,
    overlayItems: ProtocolOverlayItem[],
  ) => Promise<void>;
  acceptProtocol: (
    projectProcessItemId: string,
    projectId: string,
    actorName: string,
  ) => Promise<void>;
  unacceptProtocol: (projectProcessItemId: string) => Promise<void>;
  ensureNoteLinks: (projectId: string, options?: { force?: boolean }) => Promise<void>;
  linkDocumentToItem: (
    projectId: string,
    projectProcessItemId: string,
    documentId: string,
  ) => Promise<void>;
  linkMeetingNoteToItem: (
    projectId: string,
    projectProcessItemId: string,
    meetingNoteId: string,
  ) => Promise<void>;
  createAndLinkMeetingNote: (
    projectId: string,
    projectProcessItemId: string,
    input: ProjectMeetingNoteInput,
    authorName: string,
  ) => Promise<ProjectMeetingNote>;
  unlinkNoteLink: (
    projectId: string,
    projectProcessItemId: string,
    linkId: string,
  ) => Promise<void>;
  loadElements: () => Promise<void>;
  createElement: (input: {
    kind: ProcessItemKind;
    title: string;
    description?: string;
    defaultPayload?: ProcessElementPayload;
  }) => Promise<ProcessElement>;
  saveElement: (element: ProcessElement) => Promise<void>;
  removeElement: (id: string) => Promise<void>;
  refreshKanbanNewTaskCount: () => Promise<void>;
  refreshKanbanOverdueTaskCount: () => Promise<void>;
  replaceProjectProcessItem: (projectId: string, item: ProjectProcessItem) => void;
};

export const useProcessStore = create<ProcessStore>((set, get) => ({
  templates: [],
  elements: [],
  kanbanNewTaskCount: 0,
  kanbanOverdueTaskCount: 0,
  projectProcesses: {},
  projectProcessItems: {},
  noteLinksByProject: {},
  protocolTemplates: [],
  protocolTemplatesHydrated: false,
  projectProtocols: {},
  teamProfiles: [],
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async (projectTypes) => {
    set({ isLoading: true, error: null });
    try {
      await ensureDefaultProcessTemplates(projectTypes);
      const [templates, processes, elements, kanbanNewTaskCount, kanbanOverdueTaskCount] = await Promise.all([
        fetchProcessTemplates(),
        fetchProjectProcesses(),
        fetchProcessElements(),
        countNewKanbanTasksForTeam().catch(() => 0),
        countOverdueKanbanTasks().catch(() => 0),
      ]);
      set({
        templates,
        elements,
        kanbanNewTaskCount,
        kanbanOverdueTaskCount,
        projectProcesses: Object.fromEntries(processes.map((process) => [process.projectId, process])),
        hydrated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Błąd ładowania procesów.",
        isLoading: false,
      });
    }
  },

  refresh: async (projectTypes) => {
    await get().hydrate(projectTypes);
  },

  getTemplateByProjectType: (projectType) =>
    get().templates.find((template) => template.projectType === projectType),

  getProjectProcess: (projectId) => get().projectProcesses[projectId],

  getProjectProcessItem: (projectId, templateItemId) =>
    get().projectProcessItems[projectId]?.[templateItemId],

  getProjectProgress: (projectId, projectType) => {
    const liveTemplate = get().getTemplateByProjectType(projectType);
    const process = get().getProjectProcess(projectId);
    const template = process
      ? resolveAnchoredProcessTemplate(process, liveTemplate)
      : liveTemplate;
    if (!template || !process) {
      return null;
    }
    return getProcessProgress(template, process);
  },

  ensureProjectProcess: async (projectId, projectType) => {
    let process = get().getProjectProcess(projectId);
    if (!process) {
      process = await getOrCreateProjectProcess(projectId, projectType);
    }

    const liveTemplate =
      get().getTemplateByProjectType(projectType) ??
      (await ensureProcessTemplateForProjectType(projectType));

    if (liveTemplate && !process.templateSnapshot) {
      process = await ensureAnchoredTemplateSnapshot(projectId, liveTemplate);
    }

    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: process! },
      templates: liveTemplate
        ? state.templates.some((entry) => entry.projectType === projectType)
          ? state.templates
          : [...state.templates, liveTemplate]
        : state.templates,
    }));
    return process!;
  },

  loadProjectProcessItems: async (projectId) => {
    const process = get().getProjectProcess(projectId);
    if (!process?.templateSnapshot) {
      return;
    }

    const items = await ensureProjectProcessItems(projectId, process.templateSnapshot);
    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: mapProjectProcessItemsByTemplateId(items),
      },
    }));
  },

  syncProjectProcessFromTemplate: async (projectId, _projectType) => {
    const response = await fetch(`/api/projects/${projectId}/process/sync-template`, {
      method: "POST",
      credentials: "include",
    });
    const payload = (await response.json()) as {
      process?: ProjectProcess;
      itemsByTemplateId?: Record<string, ProjectProcessItem>;
      error?: string;
    };

    if (!response.ok || !payload.process || !payload.itemsByTemplateId) {
      throw new Error(payload.error ?? "Nie udało się wczytać szablonu procesu.");
    }

    get().applyProjectProcessSync(projectId, payload.process, payload.itemsByTemplateId);
    return payload.process;
  },

  applyProjectProcessSync: (projectId, process, itemsByTemplateId) => {
    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: process },
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: itemsByTemplateId,
      },
    }));
  },

  ensureProjectProcessItems: async (projectId, template) => {
    const items = await ensureProjectProcessItems(projectId, template);
    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: mapProjectProcessItemsByTemplateId(items),
      },
    }));
  },

  loadTeamProfiles: async () => {
    const teamProfiles = await fetchTeamProfiles();
    set({ teamProfiles });
  },

  ensureTemplateForProjectType: async (projectType) => {
    const existing = get().getTemplateByProjectType(projectType);
    if (existing) {
      return existing;
    }

    const created = await ensureProcessTemplateForProjectType(projectType);
    if (!created) {
      throw new Error(`Nie udało się utworzyć szablonu dla typu „${projectType}”.`);
    }

    set((state) => ({
      templates: [...state.templates.filter((template) => template.projectType !== projectType), created],
    }));
    return created;
  },

  saveTemplate: async (template) => {
    const saved = await saveProcessTemplate(template);
    if (!saved) {
      throw new Error("Nie udało się zapisać szablonu.");
    }
    set((state) => ({
      templates: state.templates.map((entry) =>
        entry.projectType === saved.projectType ? saved : entry,
      ),
    }));
  },

  saveChecklistPayload: async (projectId, templateItemId, payload, actorName) => {
    const saved = await saveProjectProcessItemChecklist(
      projectId,
      templateItemId,
      payload,
      actorName,
    );
    const process = await fetchProjectProcess(projectId);

    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: {
          ...state.projectProcessItems[projectId],
          [templateItemId]: saved,
        },
      },
      projectProcesses: process
        ? { ...state.projectProcesses, [projectId]: process }
        : state.projectProcesses,
    }));
  },

  assignProcessItem: async (projectId, templateItemId, assigneeId) => {
    const profile = get().teamProfiles.find((entry) => entry.id === assigneeId);
    const assigneeName = profile ? getUserDisplayName(profile) : null;
    const saved = await assignProjectProcessItem(
      projectId,
      templateItemId,
      assigneeId,
      assigneeName,
    );

    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: {
          ...state.projectProcessItems[projectId],
          [templateItemId]: saved,
        },
      },
    }));
  },

  signProcessItem: async (projectId, templateItemId, signer, signatureNote) => {
    const saved = await signProjectProcessItem(
      projectId,
      templateItemId,
      signer,
      signatureNote,
    );
    const process = await fetchProjectProcess(projectId);

    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: {
          ...state.projectProcessItems[projectId],
          [templateItemId]: saved,
        },
      },
      projectProcesses: process
        ? { ...state.projectProcesses, [projectId]: process }
        : state.projectProcesses,
    }));
  },

  toggleItemCompletion: async (projectId, itemId, completed, completedBy) => {
    const current = get().projectProcesses[projectId];
    if (!current) {
      throw new Error("Nie znaleziono procesu projektu.");
    }

    const optimisticCompletions = { ...current.completions };
    if (completed) {
      optimisticCompletions[itemId] = {
        completedAt: new Date().toISOString(),
        completedBy,
      };
    } else {
      delete optimisticCompletions[itemId];
    }

    const optimistic: ProjectProcess = {
      ...current,
      completions: optimisticCompletions,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: optimistic },
    }));

    try {
      const updated = await updateProjectProcessCompletion(
        projectId,
        itemId,
        completed,
        completedBy,
      );
      set((state) => ({
        projectProcesses: { ...state.projectProcesses, [projectId]: updated },
      }));
    } catch (error) {
      set((state) => ({
        projectProcesses: { ...state.projectProcesses, [projectId]: current },
        error: error instanceof Error ? error.message : "Błąd zapisu postępu procesu.",
      }));
      throw error;
    }
  },

  saveMilestoneDate: async (projectId, milestoneId, plannedDate) => {
    const current = get().projectProcesses[projectId];
    if (!current) {
      throw new Error("Nie znaleziono procesu projektu.");
    }

    const optimistic: ProjectProcess = {
      ...current,
      milestoneDates: { ...current.milestoneDates, [milestoneId]: plannedDate },
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: optimistic },
    }));

    try {
      const updated = await updateProjectProcessMilestoneDate(
        projectId,
        milestoneId,
        plannedDate,
      );
      set((state) => ({
        projectProcesses: { ...state.projectProcesses, [projectId]: updated },
      }));
    } catch (error) {
      set((state) => ({
        projectProcesses: { ...state.projectProcesses, [projectId]: current },
        error: error instanceof Error ? error.message : "Błąd zapisu daty kamienia milowego.",
      }));
      throw error;
    }
  },

  setItemBlocksNextStage: async (projectId, templateItemId, blocksNextStage) => {
    const saved = await setProjectProcessItemBlocksNextStage(
      projectId,
      templateItemId,
      blocksNextStage,
    );
    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: {
          ...state.projectProcessItems[projectId],
          [templateItemId]: saved,
        },
      },
    }));
  },

  setActiveStage: async (projectId, stageId) => {
    const updated = await updateProjectProcessActiveStage(projectId, stageId);
    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: updated },
    }));
  },

  addProjectProcessItem: async (projectId, milestoneId, input) => {
    const { process } = await addProjectProcessSnapshotItem(projectId, milestoneId, input);
    set((state) => ({
      projectProcesses: { ...state.projectProcesses, [projectId]: process },
    }));
    if (process.templateSnapshot) {
      await get().loadProjectProcessItems(projectId);
    }
  },

  removeProjectProcessItem: async (projectId, itemId) => {
    const updated = await removeProjectProcessSnapshotItem(projectId, itemId);
    set((state) => {
      const items = { ...(state.projectProcessItems[projectId] ?? {}) };
      delete items[itemId];
      return {
        projectProcesses: { ...state.projectProcesses, [projectId]: updated },
        projectProcessItems: { ...state.projectProcessItems, [projectId]: items },
      };
    });
  },

  ensureProtocolTemplates: async (options) => {
    if (get().protocolTemplatesHydrated && !options?.force) {
      return;
    }
    if (protocolTemplatesLoadPromise && !options?.force) {
      return protocolTemplatesLoadPromise;
    }
    const promise = (async () => {
      const templates = await fetchProtocolTemplates();
      set({ protocolTemplates: templates, protocolTemplatesHydrated: true });
    })().finally(() => {
      protocolTemplatesLoadPromise = null;
    });
    protocolTemplatesLoadPromise = promise;
    return promise;
  },

  createProtocolTemplate: async (input) => {
    const created = await createProtocolTemplateRepo(input);
    set((state) => ({ protocolTemplates: [...state.protocolTemplates, created] }));
    return created;
  },

  saveProtocolTemplate: async (template, replaceReferenceFile) => {
    const saved = await saveProtocolTemplateRepo(template, replaceReferenceFile);
    set((state) => ({
      protocolTemplates: state.protocolTemplates.map((entry) => (entry.id === saved.id ? saved : entry)),
    }));
  },

  removeProtocolTemplate: async (id) => {
    const existing = get().protocolTemplates.find((entry) => entry.id === id);
    await deleteProtocolTemplate(id, existing?.referencePdfPath);
    set((state) => ({
      protocolTemplates: state.protocolTemplates.filter((entry) => entry.id !== id),
    }));
  },

  ensureProjectProtocol: async (projectProcessItemId, options) => {
    const cached = get().projectProtocols[projectProcessItemId];
    if (cached && !options?.force) {
      return cached;
    }
    const inFlight = projectProtocolLoadPromises.get(projectProcessItemId);
    if (inFlight && !options?.force) {
      await inFlight;
      return get().projectProtocols[projectProcessItemId]!;
    }
    const promise = (async () => {
      const protocol = await fetchOrCreateProjectProcessProtocol(projectProcessItemId);
      set((state) => ({
        projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: protocol },
      }));
    })().finally(() => {
      projectProtocolLoadPromises.delete(projectProcessItemId);
    });
    projectProtocolLoadPromises.set(projectProcessItemId, promise);
    await promise;
    return get().projectProtocols[projectProcessItemId]!;
  },

  chooseProtocolTemplateForItem: async (projectProcessItemId, protocolTemplateId) => {
    const updated = await assignProtocolTemplateToItem(projectProcessItemId, protocolTemplateId);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },

  saveProtocolFieldValues: async (projectProcessItemId, fieldValues, notes) => {
    const updated = await saveProtocolFieldValuesRepo(projectProcessItemId, fieldValues, notes);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },

  signProtocolCompany: async (projectProcessItemId, signature) => {
    const updated = await signProtocolAsCompany(projectProcessItemId, signature);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },

  signProtocolClient: async (projectProcessItemId, signature) => {
    const updated = await signProtocolAsClient(projectProcessItemId, signature);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },

  clearProtocolSignature: async (projectProcessItemId, which) => {
    const updated = await clearProtocolSignatureRepo(projectProcessItemId, which);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },
  saveProtocolAnnotation: async (projectProcessItemId, page, dataUrl) => {
    const updated = await saveProtocolAnnotationRepo(projectProcessItemId, page, dataUrl);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },
  saveProtocolOverlayItems: async (projectProcessItemId, overlayItems) => {
    const updated = await saveProtocolOverlayItemsRepo(projectProcessItemId, overlayItems);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },
  acceptProtocol: async (projectProcessItemId, projectId, actorName) => {
    const protocol = get().projectProtocols[projectProcessItemId];
    if (!protocol) {
      throw new Error("Protokół nie został jeszcze wczytany.");
    }
    const template =
      get().protocolTemplates.find((entry) => entry.id === protocol.protocolTemplateId) ?? null;
    const { protocol: updated } = await acceptProtocolRepo(protocol, template, projectId, actorName);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },
  unacceptProtocol: async (projectProcessItemId) => {
    const updated = await unacceptProtocolRepo(projectProcessItemId);
    set((state) => ({
      projectProtocols: { ...state.projectProtocols, [projectProcessItemId]: updated },
    }));
  },

  ensureNoteLinks: async (projectId, options) => {
    const force = options?.force ?? false;
    if (!force && get().noteLinksByProject[projectId]) {
      return;
    }

    const inFlight = noteLinksLoadPromises.get(projectId);
    if (inFlight && !force) {
      return inFlight;
    }

    const itemIds = Object.values(get().projectProcessItems[projectId] ?? {}).map(
      (item) => item.id,
    );

    const promise = (async () => {
      const links = await fetchProcessItemLinksForItems(itemIds);
      const grouped: Record<string, ProcessItemLink[]> = {};
      links.forEach((link) => {
        (grouped[link.projectProcessItemId] ??= []).push(link);
      });
      set((state) => ({
        noteLinksByProject: { ...state.noteLinksByProject, [projectId]: grouped },
      }));
    })().finally(() => {
      noteLinksLoadPromises.delete(projectId);
    });

    noteLinksLoadPromises.set(projectId, promise);
    return promise;
  },

  linkDocumentToItem: async (projectId, projectProcessItemId, documentId) => {
    const link = await linkDocumentToProcessItem(projectProcessItemId, documentId);
    set((state) => {
      const current = state.noteLinksByProject[projectId]?.[projectProcessItemId] ?? [];
      return {
        noteLinksByProject: {
          ...state.noteLinksByProject,
          [projectId]: {
            ...state.noteLinksByProject[projectId],
            [projectProcessItemId]: [...current, link],
          },
        },
      };
    });
  },

  linkMeetingNoteToItem: async (projectId, projectProcessItemId, meetingNoteId) => {
    const link = await linkMeetingNoteToProcessItem(projectProcessItemId, meetingNoteId);
    set((state) => {
      const current = state.noteLinksByProject[projectId]?.[projectProcessItemId] ?? [];
      return {
        noteLinksByProject: {
          ...state.noteLinksByProject,
          [projectId]: {
            ...state.noteLinksByProject[projectId],
            [projectProcessItemId]: [...current, link],
          },
        },
      };
    });
  },

  createAndLinkMeetingNote: async (projectId, projectProcessItemId, input, authorName) => {
    const note = await createProjectMeetingNote(projectId, input, authorName);
    await get().linkMeetingNoteToItem(projectId, projectProcessItemId, note.id);
    return note;
  },

  unlinkNoteLink: async (projectId, projectProcessItemId, linkId) => {
    await unlinkProcessItemLink(linkId);
    set((state) => {
      const current = state.noteLinksByProject[projectId]?.[projectProcessItemId] ?? [];
      return {
        noteLinksByProject: {
          ...state.noteLinksByProject,
          [projectId]: {
            ...state.noteLinksByProject[projectId],
            [projectProcessItemId]: current.filter((entry) => entry.id !== linkId),
          },
        },
      };
    });
  },

  loadElements: async () => {
    const elements = await fetchProcessElements();
    set({ elements });
  },

  createElement: async (input) => {
    const created = await createProcessElement(input);
    set((state) => ({
      elements: [...state.elements, created].sort((a, b) => a.title.localeCompare(b.title, "pl")),
    }));
    return created;
  },

  saveElement: async (element) => {
    const saved = await saveProcessElement(element);
    set((state) => ({
      elements: state.elements
        .map((entry) => (entry.id === saved.id ? saved : entry))
        .sort((a, b) => a.title.localeCompare(b.title, "pl")),
    }));
    const templates = await fetchProcessTemplates();
    set({ templates });
  },

  removeElement: async (id) => {
    await deleteProcessElement(id);
    set((state) => ({
      elements: state.elements.filter((entry) => entry.id !== id),
    }));
  },

  refreshKanbanNewTaskCount: async () => {
    try {
      const kanbanNewTaskCount = await countNewKanbanTasksForTeam();
      set({ kanbanNewTaskCount });
    } catch {
      set({ kanbanNewTaskCount: 0 });
    }
  },

  refreshKanbanOverdueTaskCount: async () => {
    try {
      const kanbanOverdueTaskCount = await countOverdueKanbanTasks();
      set({ kanbanOverdueTaskCount });
    } catch {
      set({ kanbanOverdueTaskCount: 0 });
    }
  },

  replaceProjectProcessItem: (projectId, item) => {
    set((state) => ({
      projectProcessItems: {
        ...state.projectProcessItems,
        [projectId]: {
          ...state.projectProcessItems[projectId],
          [item.templateItemId]: item,
        },
      },
    }));
  },
}));
