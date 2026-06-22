export const DASHBOARD_CONTENT_SECTIONS = ["links", "files", "instructions"] as const;
export type DashboardContentSection = (typeof DASHBOARD_CONTENT_SECTIONS)[number];

export const DASHBOARD_CONTENT_TYPES = ["link", "image", "video", "youtube", "file"] as const;
export type DashboardContentType = (typeof DASHBOARD_CONTENT_TYPES)[number];

export type ProjectDashboardContent = {
  id: string;
  projectId: string;
  section: DashboardContentSection;
  contentType: DashboardContentType;
  title: string;
  url: string;
  description: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDashboardContentInput = {
  section: DashboardContentSection;
  contentType?: DashboardContentType;
  title: string;
  url: string;
  description?: string;
};

export const DASHBOARD_CONTENT_SECTION_LABELS: Record<DashboardContentSection, string> = {
  links: "Linki zewnętrzne",
  files: "Pliki i zdjęcia",
  instructions: "Instrukcje",
};
