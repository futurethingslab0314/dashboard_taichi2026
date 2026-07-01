export type Language = "zh" | "en";
export type ViewMode = "components" | "exhibition" | "website";

export interface ContentComponent {
  id: string;
  sheetRow?: number;
  title: string;
  zh: string;
  en: string;
  status: "done" | "zh-needed" | "en-needed" | "review";
  kind: string;
  scope: "shared" | "exhibition" | "website";
  updatedAt?: string;
}

export interface Placement {
  id: string;
  sheetRow?: number;
  number: string;
  title: string;
  floor?: "5F" | "12F";
  area: string;
  refs: string[];
  updatedAt?: string;
}

export interface WebsitePage {
  id: string;
  title: string;
  refs: string[];
}

export type DraftMap = Record<string, Pick<ContentComponent, "zh" | "en">>;
