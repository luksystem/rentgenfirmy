import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/types";
import { HttpError } from "@/lib/auth/http-error";
import { fetchAccessibleProjectIdsForUserServer } from "@/lib/supabase/project-access-server";

type AdminClient = SupabaseClient;

type RoomAccessProfile = {
  id: string;
  role: string;
  isActive: boolean;
  allProjectsAccess: boolean;
};

async function fetchAccessProfile(admin: AdminClient, profileId: string): Promise<RoomAccessProfile | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, is_active, all_projects_access")
    .eq("id", profileId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    role: data.role as string,
    isActive: Boolean(data.is_active),
    allProjectsAccess: data.all_projects_access !== false,
  };
}

async function fetchRoomProjectId(admin: AdminClient, roomId: string): Promise<string | null> {
  const { data, error } = await admin.from("chat_rooms").select("project_id").eq("id", roomId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data?.project_id as string | undefined) ?? null;
}

async function hasExplicitMembership(admin: AdminClient, roomId: string, profileId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("chat_room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

async function hasManagerProjectAccess(admin: AdminClient, profile: RoomAccessProfile, projectId: string) {
  const allowed = await fetchAccessibleProjectIdsForUserServer(admin, {
    id: profile.id,
    role: profile.role as UserRole,
    allProjectsAccess: profile.allProjectsAccess,
  });
  return allowed === "all" || allowed.includes(projectId);
}

/** Lustrzane odbicie public.is_chat_room_member() z 193_chat_rls_helpers_and_policies.sql. */
export async function isChatRoomMember(admin: AdminClient, profileId: string, roomId: string): Promise<boolean> {
  const profile = await fetchAccessProfile(admin, profileId);
  if (!profile || !profile.isActive) {
    return false;
  }
  if (profile.role === "administrator") {
    return true;
  }

  const projectId = await fetchRoomProjectId(admin, roomId);
  if (!projectId) {
    return false;
  }

  if (profile.role === "manager" && (await hasManagerProjectAccess(admin, profile, projectId))) {
    return true;
  }

  return hasExplicitMembership(admin, roomId, profileId);
}

export async function assertChatRoomMember(admin: AdminClient, profileId: string, roomId: string) {
  const member = await isChatRoomMember(admin, profileId, roomId);
  if (!member) {
    throw new HttpError(403, "Brak dostępu do tego pokoju czatu.");
  }
}

/** Lustrzane odbicie public.can_manage_chat_room() — administrator/manager-z-dostępem/owner pokoju. */
export async function canManageChatRoom(admin: AdminClient, profileId: string, roomId: string): Promise<boolean> {
  const profile = await fetchAccessProfile(admin, profileId);
  if (!profile || !profile.isActive) {
    return false;
  }
  if (profile.role === "administrator") {
    return true;
  }

  const projectId = await fetchRoomProjectId(admin, roomId);
  if (!projectId) {
    return false;
  }

  if (profile.role === "manager" && (await hasManagerProjectAccess(admin, profile, projectId))) {
    return true;
  }

  const { data, error } = await admin
    .from("chat_room_members")
    .select("role_in_room")
    .eq("room_id", roomId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.role_in_room === "owner";
}

export async function assertCanManageChatRoom(admin: AdminClient, profileId: string, roomId: string) {
  const canManage = await canManageChatRoom(admin, profileId, roomId);
  if (!canManage) {
    throw new HttpError(403, "Brak uprawnień do zarządzania tym pokojem.");
  }
}

/** Lustrzane odbicie public.can_manage_chat_project() — administrator/manager-z-dostępem do projektu. */
export async function assertCanManageChatProject(admin: AdminClient, profileId: string, projectId: string) {
  const profile = await fetchAccessProfile(admin, profileId);
  if (!profile || !profile.isActive) {
    throw new HttpError(403, "Brak dostępu do tego projektu.");
  }
  if (profile.role === "administrator") {
    return;
  }
  if (profile.role === "manager" && (await hasManagerProjectAccess(admin, profile, projectId))) {
    return;
  }
  throw new HttpError(403, "Brak uprawnień do zarządzania pokojami tego projektu.");
}
