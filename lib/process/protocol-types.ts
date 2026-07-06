export const PROTOCOL_FIELD_TYPES = ["text", "textarea", "checkbox", "select", "date"] as const;
export type ProtocolFieldType = (typeof PROTOCOL_FIELD_TYPES)[number];

export const PROTOCOL_FIELD_TYPE_LABELS: Record<ProtocolFieldType, string> = {
  text: "Pole tekstowe",
  textarea: "Dłuższy tekst",
  checkbox: "Checkbox (tak/nie)",
  select: "Lista wyboru",
  date: "Data",
};

export type ProtocolField = {
  id: string;
  type: ProtocolFieldType;
  label: string;
  required?: boolean;
  options?: string[];
};

export type ProtocolTemplateSource = "custom" | "pdf";

export type ProtocolTemplate = {
  id: string;
  name: string;
  description: string;
  source: ProtocolTemplateSource;
  fields: ProtocolField[];
  referencePdfPath: string | null;
  referencePdfName: string | null;
  referencePdfUrl?: string | null;
  projectType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProtocolFieldValue = string | boolean | null;

export type ProtocolSignature = {
  imageDataUrl: string;
  signerName: string;
  signedAt: string;
};

export type ProjectProcessProtocol = {
  id: string;
  projectProcessItemId: string;
  protocolTemplateId: string | null;
  fieldValues: Record<string, ProtocolFieldValue>;
  notes: string;
  companySignature: ProtocolSignature | null;
  clientSignature: ProtocolSignature | null;
  createdAt: string;
  updatedAt: string;
};

export function emptyProtocolTemplate(): Omit<ProtocolTemplate, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    description: "",
    source: "custom",
    fields: [],
    referencePdfPath: null,
    referencePdfName: null,
    projectType: null,
  };
}

export function isProtocolFullySigned(protocol: ProjectProcessProtocol | null | undefined) {
  return Boolean(protocol?.companySignature && protocol?.clientSignature);
}
