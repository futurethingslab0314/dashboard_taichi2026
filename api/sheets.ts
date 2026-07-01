import { createSign } from "node:crypto";
import type { ContentComponent, Placement } from "../../src/types";
import { components as seedComponents, exhibitionPlacements } from "../../src/data";

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID ?? "1m88_EM5kH3wkRFNbx29jzw9KvwXZIxGUvy2rfR7u4iM";
const COMPONENT_TAB = "文案元件";
const PLACEMENT_TAB = "展區(我整理的)";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type SheetPayload = {
  components: ContentComponent[];
  placements: Placement[];
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function readJsonBody<T>(body: unknown): T {
  return body as T;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: SHEETS_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(normalizePrivateKey(privateKey));
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

function splitTagCell(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTagCell(values: string[]) {
  return [...new Set(values)].join(", ");
}

function hydrateComponent(row: string[], rowNumber: number): ContentComponent {
  const seed = seedComponents.find((item) => item.title === row[0] || item.id === row[0]);
  return {
    ...(seed ?? {
      id: row[0] ?? `component-${rowNumber}`,
      title: row[0] ?? "",
      zh: row[1] ?? "",
      en: row[2] ?? "",
      status: "done",
      kind: "sheet",
      scope: "shared",
    }),
    id: seed?.id ?? row[0] ?? `component-${rowNumber}`,
    title: row[0] ?? seed?.title ?? "",
    zh: row[1] ?? seed?.zh ?? "",
    en: row[2] ?? seed?.en ?? "",
    updatedAt: row[3] ?? seed?.updatedAt ?? "",
    sheetRow: rowNumber,
  };
}

function hydratePlacement(row: string[], rowNumber: number): Placement {
  const seed = exhibitionPlacements.find((item) => item.number === row[0] || item.title === row[1]);
  return {
    ...(seed ?? {
      id: row[1] ?? `placement-${rowNumber}`,
      number: row[0] ?? "",
      title: row[1] ?? "",
      area: row[5] ?? "",
      refs: [],
    }),
    id: seed?.id ?? row[1] ?? `placement-${rowNumber}`,
    number: row[0] ?? seed?.number ?? "",
    title: row[1] ?? seed?.title ?? "",
    area: row[5] ?? seed?.area ?? "",
    refs: splitTagCell(row[2] ?? ""),
    updatedAt: row[6] ?? seed?.updatedAt ?? "",
    sheetRow: rowNumber,
  };
}

async function readSheetValues(range: string) {
  const response = await sheetsFetch(`/values/${encodeURIComponent(range)}`);
  if (!response.ok) {
    throw new Error(`Read failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? [];
}

async function readPayload(): Promise<SheetPayload> {
  const [componentRows, placementRows] = await Promise.all([
    readSheetValues(`${COMPONENT_TAB}!A2:D1000`),
    readSheetValues(`${PLACEMENT_TAB}!A2:G1000`),
  ]);

  const components = componentRows
    .filter((row) => row.some(Boolean))
    .map((row, index) => hydrateComponent(row, index + 2));

  const placements = placementRows
    .filter((row) => row.some(Boolean))
    .map((row, index) => hydratePlacement(row, index + 2));

  return { components, placements };
}

async function writeComponent(rowNumber: number, component: ContentComponent) {
  const currentValues = await readSheetValues(`${COMPONENT_TAB}!A${rowNumber}:D${rowNumber}`);
  const existing = currentValues[0] ?? [];
  const updatedRow = [
    component.title,
    component.zh,
    component.en,
    component.updatedAt ?? nowStamp(),
    ...existing.slice(4),
  ];

  const response = await sheetsFetch(`/values/${encodeURIComponent(`${COMPONENT_TAB}!A${rowNumber}:D${rowNumber}`)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ values: [updatedRow] }),
  });
  if (!response.ok) {
    throw new Error(`Write component failed: ${response.status} ${await response.text()}`);
  }
}

async function writePlacement(rowNumber: number, placement: Placement & { preview?: string }) {
  const currentValues = await readSheetValues(`${PLACEMENT_TAB}!A${rowNumber}:G${rowNumber}`);
  const existing = currentValues[0] ?? [];
  const refsCell = joinTagCell(placement.refs);
  const preview = placement.preview ?? "";
  const updatedRow = [
    placement.number,
    placement.title,
    refsCell,
    preview,
    preview,
    existing[5] ?? placement.area ?? "",
    placement.updatedAt ?? nowStamp(),
  ];

  const response = await sheetsFetch(`/values/${encodeURIComponent(`${PLACEMENT_TAB}!A${rowNumber}:G${rowNumber}`)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ values: [updatedRow] }),
  });
  if (!response.ok) {
    throw new Error(`Write placement failed: ${response.status} ${await response.text()}`);
  }
}

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const payload = await readPayload();
      return Response.json(payload);
    }

    if (request.method === "POST") {
      const body = readJsonBody<
        | { type: "component"; row?: number; component: ContentComponent }
        | { type: "placement"; row?: number; placement: Placement & { preview?: string } }
      >(await request.json());

      if (body.type === "component") {
        if (!body.row) throw new Error("Missing component row number");
        await writeComponent(body.row, body.component);
      } else {
        if (!body.row) throw new Error("Missing placement row number");
        await writePlacement(body.row, body.placement);
      }

      const payload = await readPayload();
      return Response.json(payload);
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
