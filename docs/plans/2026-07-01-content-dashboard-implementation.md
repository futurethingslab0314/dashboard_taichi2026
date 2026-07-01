# Content Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dashboard with two editable Google Sheet-synced views: `文案元件` for reusable bilingual content blocks, and `展場文案` for exhibition areas that reference those blocks via multi-select tags.

**Architecture:** The app will keep Google Sheets as the source of truth while using the dashboard as the editing surface. `文案元件` rows will be edited in-place and saved with `updatedAt`; `展場文案` rows will store a comma-separated multi-tag list of component names, render a composed preview from the selected components, and update their own `updatedAt` whenever either the area composition or any referenced component content changes. The UI will be split into a left navigation list, a center editor, and a right preview area per tab, with the exhibition tab resolving tags into assembled content on the fly.

**Tech Stack:** React + TypeScript + Vite, Google Sheets connector/API, local state with explicit Save actions, and the existing dashboard styling system in `src/styles.css`.

---

### Task 1: Define the sheet-backed data model

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data.ts`

**Step 1: Write the data model changes**

- Add explicit types for:
  - `ContentComponent`
  - `ExhibitionArea`
  - `SheetRowMeta`
  - `UpdatedAt` tracking
- Represent exhibition tags as `string[]` in the app state, while serializing them to a single sheet cell as a multiple-tag list.

**Step 2: Implement the minimal model helpers**

- Add helpers for:
  - parsing a tag cell into an array
  - serializing an array back into a tag cell
  - building a composed exhibition preview from selected component names
  - detecting whether referenced component content changed

**Step 3: Verify**

- Run TypeScript build checks.
- Confirm all existing data fixtures still parse.

### Task 2: Replace the single-view editor with two dashboard tabs

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Step 1: Write the UI structure**

- Add top-level tabs:
  - `文案元件`
  - `展場文案`
- Keep the existing left-sidebar / center-editor / right-preview structure.

**Step 2: Implement `文案元件` tab**

- Left panel lists component names from Google Sheet.
- Center panel shows:
  - component name
  - Chinese content editor
  - English content editor
  - `Save` button
  - `updatedAt`
- Right panel shows a read-only preview of the current selection.

**Step 3: Implement `展場文案` tab**

- Left panel lists exhibition areas by:
  - number
  - area name
  - section label
- Center panel shows:
  - the current area
  - a multi-select tag picker that only allows existing component names
  - a composed content preview
  - `Save` button
  - `updatedAt`
- Right panel shows the assembled content from selected tags.

**Step 4: Verify**

- Confirm the layout does not reintroduce the removed right-most metadata panel.
- Confirm Chinese and English are shown one language at a time.

### Task 3: Add Google Sheets read/write sync

**Files:**
- Modify: `src/App.tsx`
- Modify: any existing Google Sheets adapter file if present, otherwise create one under `src/lib/`

**Step 1: Write the save workflow**

- Keep edits in local component state until `Save`.
- On save:
  - write the edited component row back to `文案元件`
  - write the exhibition row back to `展場文案`
  - update the relevant `updatedAt` cell in Sheets

**Step 2: Implement change propagation**

- When a component changes, recompute which exhibition areas reference it.
- Mark referenced exhibition areas as dirty.
- On save, update each affected area’s `updatedAt`.

**Step 3: Verify**

- Test saving one component and one exhibition area independently.
- Test that changing a component marks all dependent areas as stale.

### Task 4: Build the multi-select tag selector for exhibition areas

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Step 1: Write the selector behavior**

- Show existing component names as selectable tags.
- Prevent free-text creation.
- Allow add/remove of selected component names.

**Step 2: Render the composed preview**

- Concatenate or group selected components into a readable preview.
- Preserve the order chosen by the user.

**Step 3: Verify**

- Confirm tag selection only uses existing component names.
- Confirm the preview updates immediately as tags change.

### Task 5: Add sheet-facing timestamps and status handling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Step 1: Write status rules**

- Show `updatedAt` on both tabs.
- Show a save state:
  - saved
  - unsaved
  - saving
  - error

**Step 2: Implement timestamp behavior**

- When a component is saved, update its own timestamp.
- When an exhibition area is saved, update its own timestamp.
- When referenced component content changes, update related exhibition area timestamps.

**Step 3: Verify**

- Confirm timestamps change only after a successful save.

### Task 6: Verify the dashboard locally

**Files:**
- No new files; use the app and browser

**Step 1: Run the app**

- Start the Vite dev server.

**Step 2: Check the two tabs**

- Ensure `文案元件` tab can:
  - select a component
  - edit Chinese and English
  - save back to the sheet
- Ensure `展場文案` tab can:
  - select an area
  - choose multiple existing components
  - preview the combined content
  - save back to the sheet

**Step 3: Check sheet sync**

- Confirm the Google Sheet updates the edited row values and timestamps.

### Task 7: Prepare Vercel deployment

**Files:**
- No new files unless deployment config needs adjustments

**Step 1: Confirm build**

- Run production build and make sure it passes.

**Step 2: Deploy**

- Deploy the finished app to Vercel.

**Step 3: Verify production**

- Open the deployed URL.
- Confirm the two tabs render and sheet sync still works.

