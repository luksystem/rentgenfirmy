export type ProjectTrade = {
  id: string;
  projectId: string;
  name: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  description: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectTradeInput = {
  name: string;
  company?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  description?: string;
};

/** Etykieta roli akceptacji powiązanej z branżą. */
export function formatProjectTradeRoleLabel(trade: Pick<ProjectTrade, "name" | "company">) {
  const name = trade.name.trim();
  const company = trade.company.trim();
  if (name && company) {
    return `${name} — ${company}`;
  }
  return name || company || "Branża";
}

export function findProjectTradeByRoleLabel(
  trades: ProjectTrade[],
  label: string,
): ProjectTrade | undefined {
  const normalized = label.trim();
  return trades.find((trade) => formatProjectTradeRoleLabel(trade) === normalized);
}
