/** Firma wykonawcza przypisana do branży (kategorii) — wpis w globalnej bazie. */
export type TradeCompanyItem = {
  tradeName: string;
  company: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  lat?: number | null;
  lng?: number | null;
  description?: string;
};

/** Projekt, w którym dana firma jest przypisana do branży. */
export type TradeCompanyProjectLink = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  contactName?: string;
  email?: string;
  phone?: string;
};

export type TradeCompanyWithProjects = TradeCompanyItem & {
  projects: TradeCompanyProjectLink[];
};
