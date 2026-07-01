export type Language = "zh" | "en";

export interface NotionContentObject {
  id: string;
  title: string;
  type: string;
  zh: string;
  en: string;
  updatedAt: string;
}

export interface NotionSectionTemplate {
  id: string;
  title: string;
  sectionType: string;
  layoutStyle: string;
  visible: boolean;
  objectIds: string[];
}

export interface NotionZoneLayout {
  id: string;
  title: string;
  page: string;
  order: number;
  visible: boolean;
  sectionIds: string[];
}

export interface NotionDashboardData {
  contentObjects: NotionContentObject[];
  sectionTemplates: NotionSectionTemplate[];
  zoneLayouts: NotionZoneLayout[];
}
