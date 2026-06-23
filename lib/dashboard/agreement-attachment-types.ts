import type { AgreementCommentAuthorSource } from "@/lib/dashboard/agreement-collaboration-types";
import type { AgreementAttachmentMediaKind } from "@/lib/dashboard/agreement-attachments";

export type AgreementAttachment = {
  id: string;
  agreementId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  mediaKind: AgreementAttachmentMediaKind;
  sizeBytes: number;
  position: number;
  uploadedByName: string;
  uploadedBySource: AgreementCommentAuthorSource;
  createdAt: string;
  url: string | null;
};
