import { createFixedPriceRow } from "@/lib/service/fixed-price";
import {
  emptyContractClient,
  type Contract,
  type ContractContentBlock,
  type ContractPaymentScheduleItem,
  type ContractSection,
  type ContractTableSection,
  type ContractTemplate,
  type ContractTextSection,
} from "@/lib/contracts/types";

export function createContractTextSection(source?: Pick<ContractContentBlock, "id" | "title" | "content">): ContractTextSection {
  return {
    id: crypto.randomUUID(),
    type: "text",
    title: source?.title ?? "",
    content: source?.content ?? "",
    struck: false,
    blockId: source?.id ?? null,
  };
}

export function createContractTableSection(group: ContractTableSection["group"] = "main"): ContractTableSection {
  return {
    id: crypto.randomUUID(),
    type: "table",
    title: "",
    description: "",
    showProductDescriptions: false,
    group,
    selected: group === "main",
    rows: [createFixedPriceRow()],
  };
}

export function createContractPaymentScheduleItem(): ContractPaymentScheduleItem {
  return { id: crypto.randomUUID(), label: "", percent: 0, note: "" };
}

export function createEmptyContract(): Contract {
  return {
    id: crypto.randomUUID(),
    status: "draft",
    templateId: null,
    clientId: null,
    contactId: null,
    title: "",
    client: emptyContractClient(),
    sections: [],
    paymentSchedule: [],
    publicToken: null,
    tokenExpiresAt: null,
    companySignature: null,
    clientSignature: null,
    history: [],
    signedDocumentStoragePath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyContractTemplate(): ContractTemplate {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    isActive: true,
    sections: [],
    paymentSchedule: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function cloneSectionWithNewIds(section: ContractSection): ContractSection {
  if (section.type === "table") {
    return {
      ...section,
      id: crypto.randomUUID(),
      rows: section.rows.map((row) => ({ ...row, id: crypto.randomUUID() })),
    };
  }
  return { ...section, id: crypto.randomUUID() };
}

/**
 * Kopiuje sekcje/harmonogram szablonu do nowej instancji, z nowymi UUID-ami — dalej edytowalne
 * niezależnie od szablonu (ten sam wzorzec co `template-factory.ts` dla procesów).
 */
export function buildContractFromTemplate(
  template: ContractTemplate,
  overrides: Partial<Pick<Contract, "clientId" | "contactId" | "client" | "title">> = {},
): Contract {
  const base = createEmptyContract();
  return {
    ...base,
    templateId: template.id,
    title: overrides.title?.trim() ? overrides.title : template.name,
    clientId: overrides.clientId ?? null,
    contactId: overrides.contactId ?? null,
    client: overrides.client ?? base.client,
    sections: template.sections.map(cloneSectionWithNewIds),
    paymentSchedule: template.paymentSchedule.map((item) => ({ ...item, id: crypto.randomUUID() })),
  };
}
