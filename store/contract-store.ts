"use client";

import { create } from "zustand";
import {
  deleteContractContentBlock,
  fetchContractContentBlocks,
  upsertContractContentBlock,
} from "@/lib/supabase/contract-content-block-repository";
import {
  deleteContract,
  fetchContracts,
  generateContractLink,
  signContractAsCompany,
  upsertContract,
} from "@/lib/supabase/contract-repository";
import {
  deleteContractTemplate,
  fetchContractTemplates,
  upsertContractTemplate,
} from "@/lib/supabase/contract-template-repository";
import type { Contract, ContractContentBlock, ContractTemplate } from "@/lib/contracts/types";

type ContractStore = {
  contracts: Contract[];
  templates: ContractTemplate[];
  contentBlocks: ContractContentBlock[];
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;

  getContractById: (id: string) => Contract | undefined;
  saveContract: (contract: Contract) => Promise<Contract>;
  removeContract: (id: string) => Promise<void>;
  regenerateContractLink: (contract: Contract) => Promise<Contract>;
  signAsCompany: (contract: Contract, signerName: string) => Promise<Contract>;

  getTemplateById: (id: string) => ContractTemplate | undefined;
  saveTemplate: (template: ContractTemplate) => Promise<ContractTemplate>;
  removeTemplate: (id: string) => Promise<void>;

  getContentBlockById: (id: string) => ContractContentBlock | undefined;
  saveContentBlock: (block: ContractContentBlock) => Promise<ContractContentBlock>;
  removeContentBlock: (id: string) => Promise<void>;
};

export const useContractStore = create<ContractStore>((set, get) => ({
  contracts: [],
  templates: [],
  contentBlocks: [],
  hydrated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const [contracts, templates, contentBlocks] = await Promise.all([
        fetchContracts(),
        fetchContractTemplates(),
        fetchContractContentBlocks(),
      ]);
      set({ contracts, templates, contentBlocks, hydrated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać danych umów.",
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    try {
      const [contracts, templates, contentBlocks] = await Promise.all([
        fetchContracts(),
        fetchContractTemplates(),
        fetchContractContentBlocks(),
      ]);
      set({ contracts, templates, contentBlocks });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Nie udało się odświeżyć danych umów." });
    }
  },

  getContractById: (id) => get().contracts.find((contract) => contract.id === id),

  saveContract: async (contract) => {
    const saved = await upsertContract(contract);
    set((state) => ({
      contracts: state.contracts.some((item) => item.id === saved.id)
        ? state.contracts.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...state.contracts],
    }));
    return saved;
  },

  removeContract: async (id) => {
    await deleteContract(id);
    set((state) => ({ contracts: state.contracts.filter((item) => item.id !== id) }));
  },

  regenerateContractLink: async (contract) => {
    const saved = await generateContractLink(contract);
    set((state) => ({
      contracts: state.contracts.map((item) => (item.id === saved.id ? saved : item)),
    }));
    return saved;
  },

  signAsCompany: async (contract, signerName) => {
    const saved = await signContractAsCompany(contract, signerName);
    set((state) => ({
      contracts: state.contracts.map((item) => (item.id === saved.id ? saved : item)),
    }));
    return saved;
  },

  getTemplateById: (id) => get().templates.find((template) => template.id === id),

  saveTemplate: async (template) => {
    const saved = await upsertContractTemplate(template);
    set((state) => ({
      templates: state.templates.some((item) => item.id === saved.id)
        ? state.templates.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...state.templates],
    }));
    return saved;
  },

  removeTemplate: async (id) => {
    await deleteContractTemplate(id);
    set((state) => ({ templates: state.templates.filter((item) => item.id !== id) }));
  },

  getContentBlockById: (id) => get().contentBlocks.find((block) => block.id === id),

  saveContentBlock: async (block) => {
    const saved = await upsertContractContentBlock(block);
    set((state) => ({
      contentBlocks: state.contentBlocks.some((item) => item.id === saved.id)
        ? state.contentBlocks.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...state.contentBlocks],
    }));
    return saved;
  },

  removeContentBlock: async (id) => {
    await deleteContractContentBlock(id);
    set((state) => ({ contentBlocks: state.contentBlocks.filter((item) => item.id !== id) }));
  },
}));
