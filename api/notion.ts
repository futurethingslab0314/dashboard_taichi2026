import type {
  NotionContentObject,
  NotionDashboardData,
  NotionSectionTemplate,
  NotionZoneLayout,
} from "../src/types";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_ROOT_PAGE_ID = process.env.NOTION_ROOT_PAGE_ID;
const API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  child_database?: { title?: string };
};

type NotionDatabaseQueryResponse = {
  results: Array<{
    id: string;
    properties: Record<string, {
      id?: string;
      type: string;
      title?: Array<{ plain_text: string }>;
      rich_text?: Array<{ plain_text: string }>;
      select?: { name: string } | null;
      multi_select?: Array<{ name: string }>;
      relation?: Array<{ id: string }>;
      checkbox?: boolean;
      number?: number | null;
      last_edited_time?: string;
    }>;
  }>;
};

function requireEnv() {
  if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
  if (!NOTION_ROOT_PAGE_ID) throw new Error("Missing NOTION_ROOT_PAGE_ID");
}

async function notionFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Notion request failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function getBlockChildren(blockId: string) {
  const response = await notionFetch(`/blocks/${blockId}/children?page_size=100`);
  const data = (await response.json()) as { results: NotionBlock[]; next_cursor?: string | null; has_more?: boolean };
  return data.results;
}

async function findChildDatabases(rootId: string) {
  const children = await getBlockChildren(rootId);
  return children.filter((item) => item.type === "child_database");
}

function pickTitle(property: { type: string; title?: Array<{ plain_text: string }> }) {
  return property.title?.map((item) => item.plain_text).join("") ?? "";
}

function pickText(property: { type: string; rich_text?: Array<{ plain_text: string }>; title?: Array<{ plain_text: string }> }) {
  if (property.type === "title") return pickTitle(property);
  return property.rich_text?.map((item) => item.plain_text).join("") ?? "";
}

function pickCheckbox(property: { type: string; checkbox?: boolean }) {
  return Boolean(property.checkbox);
}

function pickNumber(property: { type: string; number?: number | null }) {
  return property.number ?? 0;
}

function pickRelation(property: { type: string; relation?: Array<{ id: string }> }) {
  return property.relation?.map((item) => item.id) ?? [];
}

function pickSelect(property: { type: string; select?: { name: string } | null }) {
  return property.select?.name ?? "";
}

function findTitleKey(properties: Record<string, { type: string }>) {
  return Object.entries(properties).find(([, value]) => value.type === "title")?.[0] ?? "";
}

function findByNames<T>(entries: Record<string, T>, names: string[]) {
  for (const name of names) {
    if (name in entries) return [name, entries[name]] as const;
  }
  return null;
}

async function queryDatabase(databaseId: string) {
  const response = await notionFetch(`/databases/${databaseId}/query`, { method: "POST", body: JSON.stringify({ page_size: 100 }) });
  return (await response.json()) as NotionDatabaseQueryResponse;
}

async function loadContentObjects(databaseId: string) {
  const data = await queryDatabase(databaseId);
  return data.results.map((row) => {
    const titleKey = findTitleKey(row.properties);
    const title = titleKey ? pickTitle(row.properties[titleKey]) : "";
    const zh = row.properties["Description (ZH)"] ? pickText(row.properties["Description (ZH)"]) : row.properties["Title (ZH)"] ? pickText(row.properties["Title (ZH)"]) : "";
    const en = row.properties["Description (EN)"] ? pickText(row.properties["Description (EN)"]) : row.properties["Title (EN)"] ? pickText(row.properties["Title (EN)"]) : "";
    const type = row.properties["Type"] ? pickSelect(row.properties["Type"]) : "";
    const updatedAt = row.properties["updatedAt"] ? pickText(row.properties["updatedAt"]) : new Date().toISOString();

    return {
      id: row.id,
      title,
      type,
      zh,
      en,
      updatedAt,
    } satisfies NotionContentObject;
  });
}

async function loadSectionTemplates(databaseId: string) {
  const data = await queryDatabase(databaseId);
  return data.results.map((row) => {
    const titleKey = findTitleKey(row.properties);
    const title = titleKey ? pickTitle(row.properties[titleKey]) : "";
    const objects = row.properties["Objects"] ? pickRelation(row.properties["Objects"]) : [];
    return {
      id: row.id,
      title,
      sectionType: row.properties["Section Type"] ? pickSelect(row.properties["Section Type"]) : "",
      layoutStyle: row.properties["Layout Style"] ? pickSelect(row.properties["Layout Style"]) : "",
      visible: row.properties["Visible"] ? pickCheckbox(row.properties["Visible"]) : false,
      objectIds: objects,
    } satisfies NotionSectionTemplate;
  });
}

async function loadZoneLayouts(databaseId: string) {
  const data = await queryDatabase(databaseId);
  return data.results.map((row) => {
    const titleKey = findTitleKey(row.properties);
    const title = titleKey ? pickTitle(row.properties[titleKey]) : "";
    const sections = row.properties["Section"] ? pickRelation(row.properties["Section"]) : [];
    return {
      id: row.id,
      title,
      page: row.properties["Page"] ? pickSelect(row.properties["Page"]) : "",
      order: row.properties["Order"] ? pickNumber(row.properties["Order"]) : 0,
      visible: row.properties["Visible"] ? pickCheckbox(row.properties["Visible"]) : false,
      sectionIds: sections,
    } satisfies NotionZoneLayout;
  });
}

export default async function handler() {
  try {
    requireEnv();
    const databases = await findChildDatabases(NOTION_ROOT_PAGE_ID!);
    const titles = databases
      .map((item) => ({ id: item.id, title: item.child_database?.title ?? "" }))
      .filter((item) => item.title);

    const contentDb = findByNames(titles, ["Content Objects - Dedup", "Content Objects"])?.[0];
    const sectionDb = findByNames(titles, ["Section Templates"])?.[0];
    const zoneDb = findByNames(titles, ["Pages / Zone Layout"])?.[0];

    if (!contentDb || !sectionDb || !zoneDb) {
      return Response.json(
        {
          error: "Could not find the three databases under NOTION_ROOT_PAGE_ID.",
          discovered: titles,
        },
        { status: 500 },
      );
    }

    const [contentObjects, sectionTemplates, zoneLayouts] = await Promise.all([
      loadContentObjects(contentDb),
      loadSectionTemplates(sectionDb),
      loadZoneLayouts(zoneDb),
    ]);

    const payload: NotionDashboardData = {
      contentObjects,
      sectionTemplates,
      zoneLayouts,
    };

    return Response.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
