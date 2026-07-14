export type VizEnergyAnalysisStatus = "none" | "pending" | "completed" | "failed";

export type VizEnergyInvoiceAnalysis = {
  summary: string;
  anomalies: string[];
  recommendations: string[];
  extractedFields: {
    totalKwh?: number | null;
    totalCostPln?: number | null;
    supplierName?: string | null;
    billingPeriodStart?: string | null;
    billingPeriodEnd?: string | null;
  };
  confidence: "low" | "medium" | "high";
  provider: "rules" | "openai";
};

export type VizEnergyInvoice = {
  id: string;
  dashboardId: string;
  projectId: string;
  documentId: string;
  documentTitle: string | null;
  documentFileName: string | null;
  documentUrl: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  totalKwh: number | null;
  totalCostPln: number | null;
  supplierName: string | null;
  analysisStatus: VizEnergyAnalysisStatus;
  analysis: VizEnergyInvoiceAnalysis | null;
  analyzedAt: string | null;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
};

export type VizEnergyInvoiceInput = {
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  totalKwh?: number | null;
  totalCostPln?: number | null;
  supplierName?: string | null;
  notes?: string | null;
};
