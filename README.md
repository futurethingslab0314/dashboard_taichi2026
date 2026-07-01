# 文案 Dashboard

This folder is a standalone Vite + React dashboard for browsing Big Bang! Futures Notion content.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel deployment

1. Create a new Vercel project from this `dashboard/` folder.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add environment variables:
   - `NOTION_TOKEN`
   - `object_ID`
   - `section_ID`
   - `zone_ID`
5. Share each target Notion database with the integration.

## API

The dashboard uses `dashboard/api/notion.ts` as a Vercel serverless function to read the three Notion databases from a single parent page.
