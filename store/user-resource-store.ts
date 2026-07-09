"use client";

import { create } from "zustand";
import type {
  UserAbsence,
  UserAbsenceInput,
  UserCertificateInput,
  UserResourceProfile,
} from "@/lib/resource-plan/user-resource-types";
import {
  addUserAbsence,
  addUserCertificate,
  deleteUserAbsence,
  deleteUserCertificate,
  fetchUserResourceProfilesBatch,
  removeUserCompetency,
  setUserOperationalRoles,
  setUserTeams,
  updateUserAbsence,
  updateUserCertificate,
  upsertUserCompetency,
} from "@/lib/supabase/user-resource-repository";

const loadPromises = new Map<string, Promise<void>>();

type UserResourceStore = {
  byUser: Record<string, UserResourceProfile>;
  loadingUsers: Record<string, boolean>;
  ensureProfile: (userId: string, options?: { force?: boolean }) => Promise<UserResourceProfile>;
  ensureProfiles: (userIds: string[], options?: { force?: boolean }) => Promise<void>;
  setRoles: (userId: string, roleItemIds: string[]) => Promise<void>;
  setTeams: (userId: string, teams: { teamItemId: string; isLead: boolean }[]) => Promise<void>;
  upsertCompetency: (userId: string, competencyItemId: string, levelItemId: string | null, notes?: string) => Promise<void>;
  removeCompetency: (userId: string, competencyItemId: string) => Promise<void>;
  addCertificate: (userId: string, input: UserCertificateInput) => Promise<void>;
  updateCertificate: (userId: string, id: string, input: Partial<UserCertificateInput>) => Promise<void>;
  removeCertificate: (userId: string, id: string) => Promise<void>;
  addAbsence: (userId: string, input: UserAbsenceInput) => Promise<void>;
  updateAbsence: (userId: string, id: string, input: Partial<UserAbsenceInput>) => Promise<void>;
  removeAbsence: (userId: string, id: string) => Promise<void>;
};

const emptyProfile = (): UserResourceProfile => ({
  roleItemIds: [],
  competencies: [],
  teams: [],
  certificates: [],
  absences: [],
});

export const useUserResourceStore = create<UserResourceStore>((set, get) => ({
  byUser: {},
  loadingUsers: {},

  ensureProfile: async (userId, options) => {
    await get().ensureProfiles([userId], options);
    return get().byUser[userId] ?? emptyProfile();
  },

  ensureProfiles: async (userIds, options) => {
    const force = options?.force ?? false;
    const missing = userIds.filter((id) => force || !get().byUser[id]);
    if (missing.length === 0) return;

    const key = missing.slice().sort().join(",");
    const inFlight = loadPromises.get(key);
    if (inFlight && !force) return inFlight;

    set({ loadingUsers: { ...get().loadingUsers, ...Object.fromEntries(missing.map((id) => [id, true])) } });

    const promise = fetchUserResourceProfilesBatch(missing)
      .then((batch) => {
        set({
          byUser: { ...get().byUser, ...batch },
          loadingUsers: { ...get().loadingUsers, ...Object.fromEntries(missing.map((id) => [id, false])) },
        });
      })
      .finally(() => {
        loadPromises.delete(key);
      });

    loadPromises.set(key, promise);
    return promise;
  },

  setRoles: async (userId, roleItemIds) => {
    await setUserOperationalRoles(userId, roleItemIds);
    const current = get().byUser[userId] ?? emptyProfile();
    set({ byUser: { ...get().byUser, [userId]: { ...current, roleItemIds } } });
  },

  setTeams: async (userId, teams) => {
    await setUserTeams(userId, teams);
    const current = get().byUser[userId] ?? emptyProfile();
    set({ byUser: { ...get().byUser, [userId]: { ...current, teams } } });
  },

  upsertCompetency: async (userId, competencyItemId, levelItemId, notes) => {
    const saved = await upsertUserCompetency(userId, competencyItemId, levelItemId, notes);
    const current = get().byUser[userId] ?? emptyProfile();
    const competencies = [...current.competencies.filter((c) => c.competencyItemId !== competencyItemId), saved];
    set({ byUser: { ...get().byUser, [userId]: { ...current, competencies } } });
  },

  removeCompetency: async (userId, competencyItemId) => {
    await removeUserCompetency(userId, competencyItemId);
    const current = get().byUser[userId] ?? emptyProfile();
    set({
      byUser: {
        ...get().byUser,
        [userId]: {
          ...current,
          competencies: current.competencies.filter((c) => c.competencyItemId !== competencyItemId),
        },
      },
    });
  },

  addCertificate: async (userId, input) => {
    const created = await addUserCertificate(userId, input);
    const current = get().byUser[userId] ?? emptyProfile();
    set({ byUser: { ...get().byUser, [userId]: { ...current, certificates: [...current.certificates, created] } } });
  },

  updateCertificate: async (userId, id, input) => {
    const updated = await updateUserCertificate(id, input);
    const current = get().byUser[userId] ?? emptyProfile();
    set({
      byUser: {
        ...get().byUser,
        [userId]: {
          ...current,
          certificates: current.certificates.map((c) => (c.id === id ? updated : c)),
        },
      },
    });
  },

  removeCertificate: async (userId, id) => {
    await deleteUserCertificate(id);
    const current = get().byUser[userId] ?? emptyProfile();
    set({
      byUser: { ...get().byUser, [userId]: { ...current, certificates: current.certificates.filter((c) => c.id !== id) } },
    });
  },

  addAbsence: async (userId, input) => {
    const created = await addUserAbsence(userId, input);
    const current = get().byUser[userId] ?? emptyProfile();
    set({
      byUser: {
        ...get().byUser,
        [userId]: { ...current, absences: sortAbsences([...current.absences, created]) },
      },
    });
  },

  updateAbsence: async (userId, id, input) => {
    const updated = await updateUserAbsence(id, input);
    const current = get().byUser[userId] ?? emptyProfile();
    set({
      byUser: {
        ...get().byUser,
        [userId]: { ...current, absences: sortAbsences(current.absences.map((a) => (a.id === id ? updated : a))) },
      },
    });
  },

  removeAbsence: async (userId, id) => {
    await deleteUserAbsence(id);
    const current = get().byUser[userId] ?? emptyProfile();
    set({ byUser: { ...get().byUser, [userId]: { ...current, absences: current.absences.filter((a) => a.id !== id) } } });
  },
}));

function sortAbsences(absences: UserAbsence[]): UserAbsence[] {
  return [...absences].sort((a, b) => a.startDate.localeCompare(b.startDate));
}
