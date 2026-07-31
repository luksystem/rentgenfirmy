// Faza 13 Krok 1 (docs/role/04 §6.2) — typy listy pokrycia zastępstwa urlopowego.
export const LEAVE_SUBSTITUTION_SLOT_STATUSES = [
  "proponowany",
  "skorygowany",
  "zaakceptowany",
  "luka",
] as const;
export type LeaveSubstitutionSlotStatus = (typeof LEAVE_SUBSTITUTION_SLOT_STATUSES)[number];

export type LeaveSubstitutionSlot = {
  id: string;
  leaveRequestId: string;
  projectId: string;
  projectName: string | null;
  roleCode: string;
  status: LeaveSubstitutionSlotStatus;
  proposedUserId: string | null;
  proposedUserName: string | null;
  proposedVia: "fallback" | "ranking" | null;
  selectedUserId: string | null;
  selectedUserName: string | null;
  gapReason: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

/** §6.4 — karta przekazania. Zobowiązania z report_leave_commitment_impact (D28) — ten sam fakt,
 * którym dziś powiadamiany jest decydent zatwierdzający urlop. */
export type SubstitutionHandoverCommitment = {
  kind: "zaplanowany" | "niezaplanowany";
  title: string;
  windowStart: string;
  windowEnd: string;
};

export type MySubstitutionProposal = {
  slotId: string;
  leaveRequestId: string;
  projectId: string;
  projectName: string | null;
  roleCode: string;
  status: LeaveSubstitutionSlotStatus;
  startDate: string;
  endDate: string;
  requesterName: string | null;
  commitments: SubstitutionHandoverCommitment[];
};
