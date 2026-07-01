# 文案 Dashboard

This folder is a standalone Vite + React dashboard for managing Big Bang! Futures copy.

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
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
5. Share the target Google Sheet with the service account email.

## API

The dashboard uses `dashboard/api/sheets.ts` as a Vercel serverless function to read and write Google Sheets.
