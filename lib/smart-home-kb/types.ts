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

export type SmartHomeKbArticle = {
  id: string;
  categoryId: string | null;
  slug: string;
  title: string;
  summary: string;
  bodyHtml: string;
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
