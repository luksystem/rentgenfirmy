"use client";

import type {
  LeaveRequest,
  LeaveRequestDecisionInput,
  LeaveRequestInput,
  LeaveRequestUpdateInput,
} from "@/lib/leave/types";
import type { LeaveSubstitutionSlot, MySubstitutionProposal } from "@/lib/leave/substitution-types";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? fallbackError);
  }
  return payload as T;
}

export async function fetchMyLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await fetch("/api/leave-requests", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: LeaveRequest[] }>(
    response,
    "Nie udało się wczytać wniosków urlopowych.",
  );
  return payload.items;
}

export async function fetchAllLeaveRequests(options?: { profileId?: string }): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  if (options?.profileId) {
    params.set("profileId", options.profileId);
  }
  const query = params.toString();
  const response = await fetch(`/api/leave-requests${query ? `?${query}` : ""}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ items: LeaveRequest[] }>(
    response,
    "Nie udało się wczytać urlopów pracowników.",
  );
  return payload.items;
}

/** Urlopy wszystkich pracowników (pending + approved) do widoku Planu Zasobów — dostępne
 * dla każdego zalogowanego, ale treść wniosku jest zredagowana na serwerze dla osób, które
 * nie są ani wnioskującym, ani jego przełożonym, ani administratorem (patrz app/api/leave-requests/route.ts). */
export async function fetchPlanningLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await fetch("/api/leave-requests?scope=planning", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: LeaveRequest[] }>(
    response,
    "Nie udało się wczytać urlopów do planu zasobów.",
  );
  return payload.items;
}

export async function createLeaveRequest(input: LeaveRequestInput): Promise<LeaveRequest> {
  const response = await fetch("/api/leave-requests", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ item: LeaveRequest }>(
    response,
    "Nie udało się złożyć wniosku o urlop.",
  );
  return payload.item;
}

export async function updateLeaveRequest(
  id: string,
  input: LeaveRequestUpdateInput,
): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave-requests/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ item: LeaveRequest }>(
    response,
    "Nie udało się zaktualizować wniosku o urlop.",
  );
  return payload.item;
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  const response = await fetch(`/api/leave-requests/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse(response, "Nie udało się usunąć wniosku o urlop.");
}

export async function decideLeaveRequest(
  id: string,
  input: LeaveRequestDecisionInput,
): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave-requests/${id}/decision`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ item: LeaveRequest }>(
    response,
    "Nie udało się zapisać decyzji.",
  );
  return payload.item;
}

export async function revertLeaveRequest(id: string): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave-requests/${id}/revert`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ item: LeaveRequest }>(
    response,
    "Nie udało się cofnąć urlopu.",
  );
  return payload.item;
}

export async function clearLeaveRequestSignature(id: string): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave-requests/${id}/clear-signature`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ item: LeaveRequest }>(
    response,
    "Nie udało się wyczyścić podpisu.",
  );
  return payload.item;
}

export async function fetchLeaveCardLink(id: string): Promise<{ url: string; name: string | null }> {
  const response = await fetch(`/api/leave-requests/${id}/card`, { credentials: "include" });
  return parseJsonResponse<{ url: string; name: string | null }>(
    response,
    "Nie udało się przygotować karty urlopowej.",
  );
}

/** Faza 13 Krok 1 (docs/role/04 §6.2) — lista pokrycia dla wniosku wymagającego planowania zastępstwa. */
export async function fetchSubstitutionSlots(leaveRequestId: string): Promise<LeaveSubstitutionSlot[]> {
  const response = await fetch(`/api/leave-requests/${leaveRequestId}/substitution-slots`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ items: LeaveSubstitutionSlot[] }>(
    response,
    "Nie udało się wczytać listy pokrycia.",
  );
  return payload.items;
}

/** §6.2 pkt 2 — wnioskujący koryguje wyjątki. */
export async function correctSubstitutionSlot(
  slotId: string,
  selectedUserId: string,
): Promise<LeaveSubstitutionSlot[]> {
  const response = await fetch(`/api/leave-substitution-slots/${slotId}/correct`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedUserId }),
  });
  const payload = await parseJsonResponse<{ items: LeaveSubstitutionSlot[] }>(
    response,
    "Nie udało się skorygować listy pokrycia.",
  );
  return payload.items;
}

/** §6.2 pkt 3 — kandydat akceptuje kartę przekazania jednym kliknięciem. */
export async function acceptSubstitutionSlot(slotId: string): Promise<void> {
  const response = await fetch(`/api/leave-substitution-slots/${slotId}/accept`, {
    method: "POST",
    credentials: "include",
  });
  await parseJsonResponse(response, "Nie udało się zaakceptować karty przekazania.");
}

/** §6.2 pkt 3 — propozycje zastępstwa skierowane do mnie, z kartą przekazania. */
export async function fetchMySubstitutionProposals(): Promise<MySubstitutionProposal[]> {
  const response = await fetch("/api/leave-substitution-slots", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: MySubstitutionProposal[] }>(
    response,
    "Nie udało się wczytać propozycji zastępstwa.",
  );
  return payload.items;
}

export async function fetchPendingLeaveRequestCount(): Promise<number> {
  const response = await fetch("/api/leave-requests/counts", { credentials: "include" });
  const payload = await parseJsonResponse<{ pendingForMeCount: number }>(
    response,
    "Nie udało się wczytać liczby wniosków.",
  );
  return payload.pendingForMeCount;
}
