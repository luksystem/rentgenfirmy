import type {
  ContractContentBlockInsert,
  ContractContentBlockRow,
  ContractInsert,
  ContractRow,
  ContractTemplateInsert,
  ContractTemplateRow,
} from "@/lib/supabase/database.types";
import {
  normalizeContractClientSignature,
  normalizeContractCompanySignature,
  normalizeContractHistory,
  normalizeContractPaymentSchedule,
  normalizeContractSections,
  normalizeContractStatus,
} from "@/lib/contracts/normalize";
import type { Contract, ContractContentBlock, ContractTemplate } from "@/lib/contracts/types";

export function rowToContract(row: ContractRow): Contract {
  return {
    id: row.id,
    status: normalizeContractStatus(row.status),
    templateId: row.template_id,
    clientId: row.client_id,
    contactId: row.contact_id,
    title: row.title,
    client: {
      fullName: row.client_full_name,
      location: row.client_location,
      email: row.client_email,
      phone: row.client_phone,
      nip: row.client_nip,
      companyName: row.client_company_name,
    },
    sections: normalizeContractSections(row.sections),
    paymentSchedule: normalizeContractPaymentSchedule(row.payment_schedule),
    publicToken: row.public_token,
    tokenExpiresAt: row.token_expires_at,
    tokenSentAt: row.token_sent_at,
    companySignature: normalizeContractCompanySignature(row.company_signature),
    clientSignature: normalizeContractClientSignature(row.client_signature),
    history: normalizeContractHistory(row.history),
    signedDocumentStoragePath: row.signed_document_storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contractToInsert(contract: Contract): ContractInsert {
  return {
    id: contract.id,
    status: contract.status,
    template_id: contract.templateId,
    client_id: contract.clientId,
    contact_id: contract.contactId,
    title: contract.title,
    client_full_name: contract.client.fullName,
    client_location: contract.client.location,
    client_email: contract.client.email,
    client_phone: contract.client.phone,
    client_nip: contract.client.nip,
    client_company_name: contract.client.companyName,
    sections: contract.sections as unknown,
    payment_schedule: contract.paymentSchedule as unknown,
    public_token: contract.publicToken,
    token_expires_at: contract.tokenExpiresAt,
    token_sent_at: contract.tokenSentAt,
    company_signature: contract.companySignature as unknown,
    client_signature: contract.clientSignature as unknown,
    history: contract.history as unknown,
    signed_document_storage_path: contract.signedDocumentStoragePath,
    created_at: contract.createdAt,
    updated_at: contract.updatedAt,
  };
}

export function rowToContractTemplate(row: ContractTemplateRow): ContractTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    sections: normalizeContractSections(row.sections),
    paymentSchedule: normalizeContractPaymentSchedule(row.payment_schedule),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contractTemplateToInsert(template: ContractTemplate): ContractTemplateInsert {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    is_active: template.isActive,
    sections: template.sections as unknown,
    payment_schedule: template.paymentSchedule as unknown,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

export function rowToContractContentBlock(row: ContractContentBlockRow): ContractContentBlock {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contractContentBlockToInsert(block: ContractContentBlock): ContractContentBlockInsert {
  return {
    id: block.id,
    title: block.title,
    category: block.category,
    content: block.content,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  };
}
