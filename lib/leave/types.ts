// Moduł "Moja praca" → Dostępność: wnioski urlopowe z workflow akceptacji
// (przełożony + administrator), podpisem elektronicznym i kartą urlopową PDF.

import { getPolishHolidayName } from "@/lib/resource-plan/polish-holidays";

export const LEAVE_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: "Oczekuje na akceptację",
  approved: "Zaakceptowany",
  rejected: "Odrzucony",
};

export type LeaveSignature = {
  imageDataUrl: string;
  signerName: string;
  signedAt: string;
};

export type LeaveRequest = {
  id: string;
  profileId: string;
  leaveTypeItemId: string | null;
  startDate: string;
  endDate: string;
  note: string;
  status: LeaveRequestStatus;
  supervisorId: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string;
  signature: LeaveSignature | null;
  generatedPdfPath: string | null;
  generatedPdfName: string | null;
  googleCalendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaveRequestInput = {
  leaveTypeItemId: string;
  startDate: string;
  endDate: string;
  note: string;
};

export type LeaveRequestDecisionInput =
  | {
      decision: "approve";
      signature: { imageDataUrl: string; signerName: string };
    }
  | {
      decision: "reject";
      decisionNote?: string;
    };

/** Liczba dni kalendarzowych wniosku (włącznie z datami granicznymi). */
export function countLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / 86_400_000) + 1);
}

/** Liczba dni roboczych wniosku (bez sobót, niedziel i polskich świąt ustawowych) —
 * potrzebna do podsumowania przepracowanych/urlopowych godzin w miesiącu. Liczy na dacie
 * lokalnej (nie UTC), żeby dzień tygodnia zgadzał się z kalendarzem widzianym przez usera. */
export function countLeaveWorkingDays(startDate: string, endDate: string): number {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const cursor = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  let workingDays = 0;
  while (cursor.getTime() <= end.getTime()) {
    const dayOfWeek = cursor.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend && !getPolishHolidayName(cursor)) {
      workingDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return workingDays;
}
