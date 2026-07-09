// Etap 2 modułu Plan Zasobów — rozszerzenie istniejącego użytkownika (profiles).
// Role/kompetencje/zespoły odwołują się do resource_dictionary_items (id) — bez sztywnych wartości.

export type UserCompetency = {
  id: string;
  userId: string;
  competencyItemId: string;
  levelItemId: string | null;
  notes: string;
};

export type UserTeamMembership = {
  teamItemId: string;
  isLead: boolean;
};

export type UserCertificate = {
  id: string;
  userId: string;
  name: string;
  issuedAt: string | null;
  expiresAt: string | null;
  fileUrl: string | null;
  notes: string;
};

export type UserCertificateInput = {
  name: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  fileUrl?: string | null;
  notes?: string;
};

export type AbsenceStatus = "planned" | "confirmed" | "cancelled";

export type UserAbsence = {
  id: string;
  userId: string;
  absenceTypeItemId: string | null;
  startDate: string;
  endDate: string;
  note: string;
  status: AbsenceStatus;
};

export type UserAbsenceInput = {
  absenceTypeItemId: string | null;
  startDate: string;
  endDate: string;
  note?: string;
  status?: AbsenceStatus;
};

export type UserResourceProfile = {
  roleItemIds: string[];
  competencies: UserCompetency[];
  teams: UserTeamMembership[];
  certificates: UserCertificate[];
  absences: UserAbsence[];
};
