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
