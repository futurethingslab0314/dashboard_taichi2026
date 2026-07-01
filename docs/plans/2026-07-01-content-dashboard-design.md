# Content Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dashboard-style web interface for browsing and editing Big Bang! Futures copy components, with separate views for exhibition placements and website pages, all backed by shared reusable content.

**Architecture:** Use a single source of truth for text components and layer placement/page references on top. The UI should expose three levels: shared component library, exhibition placements grouped by floor/area, and website pages grouped by page. Editing a component updates every placement that references it. Floor and venue labels should be parameterized so 5F/12F can be swapped without rewriting content.

**Tech Stack:** Next.js, React, TypeScript, local file-based data store or JSON seed data, CSS modules or Tailwind depending on existing repo conventions, Vitest or equivalent for unit tests.

---

### Task 1: Scaffold the dashboard data model

**Files:**
- Create: `src/data/content-components.ts`
- Create: `src/data/exhibition-placements.ts`
- Create: `src/data/website-pages.ts`
- Create: `src/data/venue-parameters.ts`
- Create: `src/types/content.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { contentComponents } from "@/data/content-components";

describe("content model", () => {
  it("exposes shared components and placements", () => {
    expect(contentComponents.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- content-model`
Expected: FAIL because data modules do not exist yet.

**Step 3: Write minimal implementation**

Create typed arrays for components, placements, pages, and venue parameters.

**Step 4: Run test to verify it passes**

Run: `npm test -- content-model`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/data src/types tests
git commit -m "feat: add dashboard content data model"
```

### Task 2: Build the dashboard layout shell

**Files:**
- Create: `src/app/dashboard/page.tsx` or `src/pages/dashboard.tsx`
- Create: `src/components/dashboard/DashboardShell.tsx`
- Create: `src/components/dashboard/Sidebar.tsx`
- Create: `src/components/dashboard/Topbar.tsx`
- Create: `src/components/dashboard/InspectorPanel.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import DashboardShell from "@/components/dashboard/DashboardShell";

it("renders dashboard sections", () => {
  render(<DashboardShell />);
  expect(screen.getByText("Component Library")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- dashboard-shell`
Expected: FAIL because the component is not implemented.

**Step 3: Write minimal implementation**

Create a three-column dashboard with a top filter bar and a main content area.

**Step 4: Run test to verify it passes**

Run: `npm test -- dashboard-shell`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/dashboard src/components/dashboard tests
git commit -m "feat: add dashboard shell"
```

### Task 3: Implement shared component library browsing

**Files:**
- Create: `src/components/dashboard/ComponentLibrary.tsx`
- Create: `src/components/dashboard/ComponentCard.tsx`
- Modify: `src/components/dashboard/Sidebar.tsx`

**Step 1: Write the failing test**

```tsx
it("filters components by translation status", () => {
  render(<ComponentLibrary filter="en-needed" />);
  expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- component-library`
Expected: FAIL.

**Step 3: Write minimal implementation**

Render reusable components with status badges, search, and filter controls.

**Step 4: Run test to verify it passes**

Run: `npm test -- component-library`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/dashboard/ComponentLibrary.tsx src/components/dashboard/ComponentCard.tsx
git commit -m "feat: add component library browsing"
```

### Task 4: Implement exhibition view with floor and area switching

**Files:**
- Create: `src/components/dashboard/ExhibitionView.tsx`
- Create: `src/components/dashboard/FloorToggle.tsx`
- Create: `src/components/dashboard/PlacementList.tsx`
- Create: `src/components/dashboard/PlacementDetail.tsx`

**Step 1: Write the failing test**

```tsx
it("switches between 5F and 12F placements", () => {
  render(<ExhibitionView />);
  expect(screen.getByText("5F")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- exhibition-view`
Expected: FAIL.

**Step 3: Write minimal implementation**

Use a floor toggle and a grouped placement list by exhibition area.

**Step 4: Run test to verify it passes**

Run: `npm test -- exhibition-view`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/dashboard/ExhibitionView.tsx src/components/dashboard/FloorToggle.tsx
git commit -m "feat: add exhibition view switching"
```

### Task 5: Implement website page view

**Files:**
- Create: `src/components/dashboard/WebsiteView.tsx`
- Create: `src/components/dashboard/PageSelector.tsx`
- Create: `src/components/dashboard/PagePreview.tsx`

**Step 1: Write the failing test**

```tsx
it("shows website pages and their referenced components", () => {
  render(<WebsiteView />);
  expect(screen.getByText("Home")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- website-view`
Expected: FAIL.

**Step 3: Write minimal implementation**

Render a page list and show referenced content blocks per page.

**Step 4: Run test to verify it passes**

Run: `npm test -- website-view`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/dashboard/WebsiteView.tsx src/components/dashboard/PageSelector.tsx
git commit -m "feat: add website page view"
```

### Task 6: Add content editing and propagation

**Files:**
- Create: `src/components/dashboard/ContentEditor.tsx`
- Create: `src/components/dashboard/TranslationStatus.tsx`
- Modify: `src/components/dashboard/InspectorPanel.tsx`
- Modify: `src/data/*`

**Step 1: Write the failing test**

```tsx
it("updates all placements when a shared component changes", () => {
  const updated = updateComponent("brand.slogan", { zh: "new zh" });
  expect(updated).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- content-propagation`
Expected: FAIL.

**Step 3: Write minimal implementation**

Store edits against the component source and derive placement/page text from references.

**Step 4: Run test to verify it passes**

Run: `npm test -- content-propagation`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/dashboard/ContentEditor.tsx src/components/dashboard/TranslationStatus.tsx
git commit -m "feat: add content editing propagation"
```

### Task 7: Add venue parameter switching

**Files:**
- Modify: `src/data/venue-parameters.ts`
- Modify: `src/components/dashboard/FloorToggle.tsx`
- Modify: `src/components/dashboard/PlacementDetail.tsx`

**Step 1: Write the failing test**

```tsx
it("resolves current venue floor dynamically", () => {
  expect(resolveVenueFloor("venue.floor.current")).toBe("venue.floor.5f");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- venue-parameters`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add a venue parameter resolver and use it in placement rendering.

**Step 4: Run test to verify it passes**

Run: `npm test -- venue-parameters`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/data/venue-parameters.ts src/components/dashboard/FloorToggle.tsx
git commit -m "feat: add venue parameter switching"
```

### Task 8: Polish filtering, empty states, and accessibility

**Files:**
- Modify: `src/components/dashboard/*`
- Create: `tests/dashboard-accessibility.test.tsx`

**Step 1: Write the failing test**

```tsx
it("announces empty states clearly", () => {
  render(<ComponentLibrary filter="missing" />);
  expect(screen.getByText("No matching components")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- dashboard-accessibility`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add empty states, keyboard-friendly tabs, and readable badges.

**Step 4: Run test to verify it passes**

Run: `npm test -- dashboard-accessibility`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/dashboard tests
git commit -m "feat: polish dashboard accessibility"
```

### Task 9: Verify end-to-end behavior

**Files:**
- Review: `src/app/dashboard/page.tsx` or `src/pages/dashboard.tsx`
- Review: all dashboard components and data files

**Step 1: Run the relevant test suite**

Run: `npm test`
Expected: All dashboard tests pass.

**Step 2: Run the app locally**

Run: `npm run dev`
Expected: Dashboard opens and supports component, exhibition, and website views.

**Step 3: Do a manual smoke test**

Expected:
- Shared components are visible
- Exhibition view switches by floor and area
- Website view switches by page
- Editing a shared component updates all references

**Step 4: Commit**

```bash
git add .
git commit -m "feat: complete content dashboard"
```
