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

/** Odręczna adnotacja (pismo/rysunek) naniesiona na jedną stronę wzoru PDF. */
export type ProtocolAnnotation = {
  page: number;
  imagePath: string;
};

/**
 * Edytowalny element nałożony na stronę wzoru PDF — pole tekstowe albo umieszczony w konkretnym
 * miejscu podpis (firma/klient). W przeciwieństwie do odręcznego pisma (`ProtocolAnnotation`,
 * rastrowe PNG) to są dane strukturalne — można je później kliknąć, poprawić, przesunąć lub usunąć.
 * Współrzędne jako ułamek (0..1) szerokości/wysokości strony — niezależne od poziomu przybliżenia.
 */
export type ProtocolOverlayItem = {
  id: string;
  page: number;
  xRatio: number;
  yRatio: number;
  kind: "text" | "signature";
  /** kind === "text" */
  text?: string;
  color?: string;
  fontSizeRatio?: number;
  /** kind === "signature" */
  which?: "company" | "client";
  widthRatio?: number;
};

export type ProjectProcessProtocol = {
  id: string;
  projectProcessItemId: string;
  protocolTemplateId: string | null;
  fieldValues: Record<string, ProtocolFieldValue>;
  notes: string;
  companySignature: ProtocolSignature | null;
  clientSignature: ProtocolSignature | null;
  /** Odręczne adnotacje na stronach wzoru PDF (tylko dla szablonów source="pdf"). */
  annotations: ProtocolAnnotation[];
  /** Pola tekstowe i umieszczone podpisy na stronach wzoru PDF. */
  overlayItems: ProtocolOverlayItem[];
  /** Ścieżka w Storage do finalnego, wygenerowanego PDF po akceptacji. */
  generatedPdfPath: string | null;
  /** Kiedy protokół zaakceptowano (protokół zablokowany do edycji, jeśli ustawione). */
  acceptedAt: string | null;
  acceptedBy: string | null;
  /** Id dokumentu projektu (project_documents), do którego dopięto finalny PDF. */
  linkedDocumentId: string | null;
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

/** Zaakceptowany protokół jest zablokowany do edycji (do czasu odblokowania przez administratora). */
export function isProtocolLocked(protocol: ProjectProcessProtocol | null | undefined) {
  return Boolean(protocol?.acceptedAt);
}
