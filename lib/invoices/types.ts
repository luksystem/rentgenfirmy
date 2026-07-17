export const PROJECT_INVOICE_KINDS = ["invoice", "cost"] as const;

export type ProjectInvoiceKind = (typeof PROJECT_INVOICE_KINDS)[number];

export const PROJECT_INVOICE_KIND_LABELS: Record<ProjectInvoiceKind, string> = {
  invoice: "Faktura kosztowa",
  cost: "Koszt",
};

export type ProjectInvoice = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  kind: ProjectInvoiceKind;
  title: string;
  vendorName: string;
  invoiceNumber: string;
  amountNet: number | null;
  amountGross: number | null;
  vatRate: number | null;
  currency: string;
  issueDate: string | null;
  notes: string;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string | null;
};

export type ProjectInvoiceInput = {
  projectId?: string | null;
  clientId?: string | null;
  kind: ProjectInvoiceKind;
  title: string;
  vendorName?: string;
  invoiceNumber?: string;
  amountNet?: number | null;
  amountGross?: number | null;
  vatRate?: number | null;
  currency?: string;
  issueDate?: string | null;
  notes?: string;
};

export function normalizeProjectInvoiceInput(input: ProjectInvoiceInput): ProjectInvoiceInput {
  return {
    ...input,
    title: input.title.trim(),
    vendorName: input.vendorName?.trim() ?? "",
    invoiceNumber: input.invoiceNumber?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    currency: input.currency?.trim() || "PLN",
    issueDate: input.issueDate?.trim() || null,
    projectId: input.projectId || null,
    clientId: input.clientId || null,
  };
}

export function formatInvoiceAmount(invoice: Pick<ProjectInvoice, "amountGross" | "amountNet" | "currency">) {
  const value = invoice.amountGross ?? invoice.amountNet;
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(2)} ${invoice.currency || "PLN"}`;
}
