export type SmartHomeKbStatus = "draft" | "published";

export type SmartHomeKbCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SmartHomeKbTag = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type SmartHomeKbArticleMedia = {
  id: string;
  articleId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  sortOrder: number;
  createdAt: string;
  url: string | null;
};

export type SmartHomeKbArticleStep = {
  title: string;
  bodyHtml: string;
};

export type SmartHomeKbArticle = {
  id: string;
  categoryId: string | null;
  slug: string;
  title: string;
  summary: string;
  bodyHtml: string;
  contextHtml: string;
  steps: SmartHomeKbArticleStep[];
  tipsHtml: string;
  youtubeUrl: string | null;
  coverImageStoragePath: string | null;
  coverImageUrl: string | null;
  status: SmartHomeKbStatus;
  sortOrder: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
  media: SmartHomeKbArticleMedia[];
};

export type SmartHomeKbFaqItem = {
  id: string;
  categoryId: string | null;
  question: string;
  answerHtml: string;
  sortOrder: number;
  status: SmartHomeKbStatus;
  createdAt: string;
  updatedAt: string;
};

export type SmartHomeKbPathTemplateItem = {
  id: string;
  templateId: string;
  articleId: string;
  sortOrder: number;
};

export type SmartHomeKbPathTemplate = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  items: SmartHomeKbPathTemplateItem[];
};

export type SmartHomeKbClientPathItem = {
  id: string;
  pathId: string;
  articleId: string;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
};

export type SmartHomeKbClientPathStatus = "active" | "archived";

export type SmartHomeKbClientPath = {
  id: string;
  clientId: string;
  name: string;
  description: string;
  sourceTemplateId: string | null;
  status: SmartHomeKbClientPathStatus;
  createdAt: string;
  updatedAt: string;
  items: SmartHomeKbClientPathItem[];
};

const COMBINING_DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

export function slugifySmartHomeKb(label: string, fallback = "wpis"): string {
  const base = label
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || fallback;
}
