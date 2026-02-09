# 등급표 (Tool Rating Board) Implementation Plan

## TL;DR

> **Quick Summary**: Implement a "등급표" (Tool Rating Board) feature allowing users to discover, filter, and view AI tools with admin ratings, click tracking, and rich visualizations.
>
> **Deliverables**:
>
> - 3 new Supabase tables (`tools`, `tool_clicks`, `tool_user_ratings`)
> - Public ratings page at `/[locale]/ratings` with filtering, sorting, search, and visualizations
> - Tool detail modal with pros/cons and click trend graph
> - Admin CRUD pages at `/[locale]/admin/tools/`
> - New chart components (RatingDistributionChart, TagDistributionChart)
> - i18n translations (ko/en)
> - Navigation link addition
>
> **Estimated Effort**: Large (15-20 tasks across database, frontend, admin, and i18n)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Database Schema → Supabase Functions → Public Page → Admin Pages

---

## Context

### Original Request

Create a "등급표" (Rating Board/Tool Directory) feature for the AI Community platform with:

- New page listing tools with ratings, tags, filtering, and visualizations
- Click tracking for popularity trends
- Admin management interface
- Future-ready user rating table (UI deferred)

### Interview Summary

**Key Discussions**:

- Route path: `/[locale]/ratings` (better matches Korean term 등급표)
- 8 tag categories defined for tool classification
- Visualizations: sparklines (reuse existing), bar chart, donut chart, leaderboard
- Follow existing `opensource-list.jsx` patterns for filtering/sorting/grid-list views
- No test infrastructure - using manual verification procedures

**Research Findings**:

- `opensource-list.jsx` provides complete filtering/sorting/view patterns
- `SparklineChart` component can be reused for click trends
- Admin CRUD patterns exist in `admin/content/` pages
- Supabase service patterns well-established (1054 lines of examples)
- Pure SVG approach for charts (no external libraries)

### Gap Analysis

**Identified Gaps** (resolved):

- Admin sidebar link → Follow existing pattern in `admin-sidebar.jsx`
- RLS policies → Follow `schema.sql` patterns
- Click debounce → Default to no debounce (allow multiple clicks)
- Tag filter behavior → Single tag at a time (like language filter)
- Image upload → URL input only (consistent with existing patterns)
- Pagination → Load all initially (can add later if needed)

---

## Work Objectives

### Core Objective

Build a complete Tool Rating Board feature enabling users to discover AI tools through filtering, search, and visualizations, with admin capabilities for tool management.

### Concrete Deliverables

1. Database migration file: `supabase/migrations/YYYYMMDD_create_tools_tables.sql`
2. Supabase service functions in `src/services/supabase.js`
3. Public page: `src/app/[locale]/ratings/page.jsx` + `ratings-list.jsx`
4. Chart components: `RatingDistributionChart.jsx`, `TagDistributionChart.jsx`
5. Tool detail modal component
6. Admin pages: `src/app/[locale]/admin/tools/` (list, new, edit)
7. i18n translations in `messages/ko.json` and `messages/en.json`
8. Navigation link in `src/components/sections/navigation.jsx`
9. Admin sidebar link in `src/components/admin/admin-sidebar.jsx`

### Definition of Done

- [ ] `npm run build` succeeds with no errors
- [ ] `/ko/ratings` page loads and displays tools
- [ ] Tag filtering, search, and sorting work correctly
- [ ] Tool detail modal opens on card click
- [ ] Sparkline shows 30-day click trend data
- [ ] Admin can create, edit, delete tools at `/ko/admin/tools/`
- [ ] Navigation shows "등급표" link
- [ ] Both Korean and English translations work

### Must Have

- Database tables with proper constraints and indexes
- Public ratings list with filtering/sorting/search
- Tool cards with sparkline visualization
- Detail modal with pros/cons
- Admin CRUD interface
- Click tracking on external link clicks
- i18n support for ko/en

### Must NOT Have (Guardrails)

- User rating UI (table created but UI deferred)
- Comments/reviews on tools
- Tool comparison feature
- Advanced analytics dashboard
- External API for tool submissions
- Image upload functionality (URL input only)
- Pagination (load all tools, add later if needed)
- Real-time updates (standard page refresh)

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: NO
- **User wants tests**: NO (not requested, no infrastructure)
- **Framework**: none
- **QA approach**: Manual verification via automated commands

### Automated Verification (NO User Intervention)

Each TODO includes EXECUTABLE verification procedures that agents can run directly.

**By Deliverable Type:**

| Type            | Verification Tool   | Automated Procedure                        |
| --------------- | ------------------- | ------------------------------------------ |
| **Database**    | Supabase CLI / psql | Run migration, verify tables exist         |
| **Frontend/UI** | Playwright skill    | Navigate, interact, screenshot, assert DOM |
| **API/Backend** | curl via Bash       | Send request, parse response, validate     |
| **Build**       | npm run build       | Exit code 0 = success                      |

**Evidence to Capture:**

- Terminal output from verification commands
- Screenshots in `.sisyphus/evidence/` for UI changes
- Build output confirming success

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Database Schema Migration
├── Task 9: i18n Translations (ko/en)
└── Task 10: Navigation Link Addition

Wave 2 (After Wave 1):
├── Task 2: Supabase Service Functions
├── Task 3: RatingDistributionChart Component
├── Task 4: TagDistributionChart Component
└── Task 11: Admin Sidebar Link

Wave 3 (After Wave 2):
├── Task 5: Ratings Page (Server Component)
├── Task 6: Ratings List (Client Component)
├── Task 7: Tool Detail Modal
└── Task 8: Click Tracking API Route

Wave 4 (After Wave 3):
├── Task 12: Admin Tools List Page
├── Task 13: Admin Create Tool Page
└── Task 14: Admin Edit Tool Page

Wave 5 (Final):
└── Task 15: Integration Testing & Build Verification

Critical Path: Task 1 → Task 2 → Task 5/6 → Task 15
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On            | Blocks               | Can Parallelize With |
| ---- | --------------------- | -------------------- | -------------------- |
| 1    | None                  | 2, 5, 6, 7, 8, 12-14 | 9, 10                |
| 2    | 1                     | 5, 6, 7, 8, 12-14    | 3, 4, 11             |
| 3    | None (pure component) | 6                    | 4, 11                |
| 4    | None (pure component) | 6                    | 3, 11                |
| 5    | 2                     | 15                   | 6, 7, 8              |
| 6    | 2, 3, 4               | 15                   | 5, 7, 8              |
| 7    | 2                     | 15                   | 5, 6, 8              |
| 8    | 2                     | 15                   | 5, 6, 7              |
| 9    | None                  | 5, 6, 12-14          | 1, 10                |
| 10   | None                  | 15                   | 1, 9                 |
| 11   | None                  | 15                   | 2, 3, 4              |
| 12   | 2, 9                  | 15                   | 13, 14               |
| 13   | 2, 9                  | 15                   | 12, 14               |
| 14   | 2, 9                  | 15                   | 12, 13               |
| 15   | All above             | None                 | None (final)         |

### Agent Dispatch Summary

| Wave | Tasks       | Recommended Dispatch  |
| ---- | ----------- | --------------------- |
| 1    | 1, 9, 10    | 3 parallel agents     |
| 2    | 2, 3, 4, 11 | 4 parallel agents     |
| 3    | 5, 6, 7, 8  | 4 parallel agents     |
| 4    | 12, 13, 14  | 3 parallel agents     |
| 5    | 15          | 1 agent (integration) |

---

## TODOs

### Task 1: Database Schema Migration

**What to do**:

- Create migration file `supabase/migrations/YYYYMMDD_create_tools_tables.sql`
- Define `tools` table with all columns (id, name, slug, description, description_en, link, thumbnail_url, admin_rating, tags, pricing, is_featured, pros, cons, timestamps)
- Define `tool_clicks` table (id, tool_id FK, clicked_at, user_id optional)
- Define `tool_user_ratings` table (id, tool_id FK, user_id FK, rating, created_at, UNIQUE constraint)
- Add indexes on frequently queried columns (slug, admin_rating, pricing, is_featured)
- Add RLS policies (public read for tools, insert for clicks, authenticated for user_ratings)
- Add CHECK constraints for admin_rating (1-5), pricing enum
- Update `supabase/schema.sql` with the new tables

**Must NOT do**:

- Create any frontend code
- Add seed data (admin will add tools)

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - No special skills needed - straightforward SQL migration
- **Skills Evaluated but Omitted**:
  - `git-master`: Not needed until commit phase

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 9, 10)
- **Blocks**: Tasks 2, 5, 6, 7, 8, 12, 13, 14
- **Blocked By**: None (can start immediately)

**References**:

- `supabase/schema.sql:1-200` - Existing table definitions, RLS policy patterns, index patterns
- `supabase/migrations/20260124_add_source_platform.sql` - Migration file format example
- `supabase/migrations/20260116_add_opensource_type.sql` - ALTER TABLE and constraint patterns

**WHY Each Reference Matters**:

- `schema.sql` shows the exact syntax for CREATE TABLE, RLS POLICY, and INDEX that Supabase expects
- Migration files show the date-prefixed naming convention and SQL structure

**Acceptance Criteria**:

```bash
# Agent runs migration verification:
# 1. Check migration file exists
ls -la supabase/migrations/*tools*.sql
# Assert: File exists with correct date prefix

# 2. Verify SQL syntax (dry run)
cat supabase/migrations/*tools*.sql | head -50
# Assert: Valid CREATE TABLE statements visible

# 3. Verify schema.sql updated
grep -n "CREATE TABLE.*tools" supabase/schema.sql
# Assert: tools table definition found
```

**Commit**: YES

- Message: `feat(db): add tools, tool_clicks, tool_user_ratings tables`
- Files: `supabase/migrations/YYYYMMDD_create_tools_tables.sql`, `supabase/schema.sql`
- Pre-commit: `npm run lint`

---

### Task 2: Supabase Service Functions

**What to do**:

- Add functions to `src/services/supabase.js`:
  - `fetchTools({ tag, sortBy, search, limit })` - List tools with filters
  - `fetchToolBySlug(slug)` - Single tool lookup
  - `recordToolClick(toolId, userId?)` - Insert click record
  - `fetchToolClickHistory(toolId, days=30)` - Get click data for sparkline
  - `fetchToolStats()` - Aggregate stats for charts (rating distribution, tag distribution, leaderboard)
  - `createTool(toolData)` - Admin create
  - `updateTool(toolId, toolData)` - Admin update
  - `deleteTool(toolId)` - Admin delete
  - `fetchAllTools()` - Admin list (no filters)

**Must NOT do**:

- Create any UI components
- Modify existing functions

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - Straightforward function additions following existing patterns
- **Skills Evaluated but Omitted**:
  - Database skills not needed - just JS/Supabase client code

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 3, 4, 11)
- **Blocks**: Tasks 5, 6, 7, 8, 12, 13, 14
- **Blocked By**: Task 1 (needs tables to exist)

**References**:

- `src/services/supabase.js:920-962` - `fetchOpenSourceContent` pattern (filters, sorting, error handling)
- `src/services/supabase.js:964-989` - `fetchOpenSourceLanguages` pattern (aggregation)
- `src/services/supabase.js:290-323` - `createContent` pattern (admin create)
- `src/services/supabase.js:325-364` - `updateContent` pattern (admin update)
- `src/services/supabase.js:366-375` - `deleteContent` pattern (admin delete)
- `src/services/supabase.js:612-631` - `fetchMetricsHistory` pattern (date range queries)

**WHY Each Reference Matters**:

- `fetchOpenSourceContent`: Shows filter chaining, error handling, client-side sorting
- `fetchOpenSourceLanguages`: Shows aggregation pattern for tag distribution
- Admin functions: Show the exact upsert/update/delete patterns
- `fetchMetricsHistory`: Shows date range calculation for click history

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify functions added
grep -n "fetchTools\|fetchToolBySlug\|recordToolClick\|fetchToolClickHistory\|fetchToolStats\|createTool\|updateTool\|deleteTool" src/services/supabase.js
# Assert: All 9 functions found

# 2. Verify export (if using named exports)
grep -n "export const fetchTools" src/services/supabase.js
# Assert: Functions are exported

# 3. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: YES

- Message: `feat(api): add Supabase functions for tools feature`
- Files: `src/services/supabase.js`
- Pre-commit: `npm run lint`

---

### Task 3: RatingDistributionChart Component

**What to do**:

- Create `src/components/content/ratings/rating-distribution-chart.jsx`
- Implement horizontal bar chart showing count of tools per star rating (5-star, 4-star, etc.)
- Use pure SVG (no external libraries) - follow SparklineChart pattern
- Accept props: `data` (array of {rating, count}), `width`, `height`
- Show bars with labels (e.g., "⭐⭐⭐⭐⭐ 12 tools")
- Color-coded bars (gold for 5-star gradient to gray for 1-star)

**Must NOT do**:

- Use external charting libraries (recharts, chart.js, etc.)
- Fetch data within component (pure presentation)

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: SVG chart component requires visual design sense
- **Skills Evaluated but Omitted**:
  - `playwright`: Not needed for component creation

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 2, 4, 11)
- **Blocks**: Task 6 (ratings-list uses this)
- **Blocked By**: None (pure component, no data dependencies)

**References**:

- `src/components/content/social-cards/sparkline-chart.jsx:1-136` - Complete SVG chart pattern (useMemo, path generation, color coding)
- `src/components/content/metrics-graph-modal.jsx:1-50` - Grid pattern and Y-axis labels

**WHY Each Reference Matters**:

- `sparkline-chart.jsx`: Shows exact pattern for SVG charts in this codebase - useMemo for calculations, cn() for classes, props structure
- `metrics-graph-modal.jsx`: Shows labeling patterns and more complex SVG layouts

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify file created
ls -la src/components/content/ratings/rating-distribution-chart.jsx
# Assert: File exists

# 2. Verify component structure
grep -n "export default function RatingDistributionChart" src/components/content/ratings/rating-distribution-chart.jsx
# Assert: Component exported

# 3. Verify SVG usage (no external libs)
grep -n "<svg\|<rect\|<text" src/components/content/ratings/rating-distribution-chart.jsx
# Assert: SVG elements found

# 4. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: NO (groups with Task 4)

---

### Task 4: TagDistributionChart Component

**What to do**:

- Create `src/components/content/ratings/tag-distribution-chart.jsx`
- Implement donut/pie chart showing tool count per tag
- Use pure SVG - calculate arc paths using trigonometry
- Accept props: `data` (array of {tag, count, color}), `width`, `height`
- Show legend with tag names and counts
- Use tag colors consistent with the 8 defined categories

**Must NOT do**:

- Use external charting libraries
- Fetch data within component

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Donut chart requires arc calculations and visual design
- **Skills Evaluated but Omitted**:
  - None - this is primarily a visual/math task

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 2, 3, 11)
- **Blocks**: Task 6 (ratings-list uses this)
- **Blocked By**: None (pure component)

**References**:

- `src/components/content/social-cards/sparkline-chart.jsx:15-48` - useMemo pattern and coordinate calculations
- SVG arc path formula: `M cx cy L x1 y1 A rx ry 0 largeArc sweep x2 y2 Z`

**WHY Each Reference Matters**:

- `sparkline-chart.jsx`: Shows the project's pattern for SVG component props, useMemo, and coordinate math
- Arc formula: Donut segments need arc path commands (not in codebase, standard SVG knowledge)

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify file created
ls -la src/components/content/ratings/tag-distribution-chart.jsx
# Assert: File exists

# 2. Verify SVG arc usage
grep -n "<path\|<circle" src/components/content/ratings/tag-distribution-chart.jsx
# Assert: Path elements for arcs found

# 3. Verify legend
grep -n "legend\|Legend" src/components/content/ratings/tag-distribution-chart.jsx
# Assert: Legend component/section exists

# 4. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: YES (with Task 3)

- Message: `feat(ui): add RatingDistributionChart and TagDistributionChart components`
- Files: `src/components/content/ratings/rating-distribution-chart.jsx`, `src/components/content/ratings/tag-distribution-chart.jsx`
- Pre-commit: `npm run lint`

---

### Task 5: Ratings Page Server Component

**What to do**:

- Create `src/app/[locale]/ratings/page.jsx`
- Server component that fetches tools data using `fetchTools()`
- Fetch tool stats using `fetchToolStats()` for charts
- Get locale using `getLocale()`
- Transform data to frontend-friendly format
- Pass to client component `RatingsList`
- Add metadata export for SEO

**Must NOT do**:

- Add filtering/sorting logic (handled by client component)
- Create the client component (separate task)

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - Follows exact pattern from opensource/page.jsx
- **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Not needed - data fetching only

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 6, 7, 8)
- **Blocks**: Task 15
- **Blocked By**: Task 2 (needs Supabase functions)

**References**:

- `src/app/[locale]/opensource/page.jsx:1-43` - EXACT pattern to follow (getLocale, Promise.all, data formatting, return client component)
- `src/services/supabase.js` - fetchTools, fetchToolStats functions (from Task 2)

**WHY Each Reference Matters**:

- `opensource/page.jsx`: This is the EXACT pattern - copy structure, replace function names and data fields

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify file created
ls -la src/app/[locale]/ratings/page.jsx
# Assert: File exists

# 2. Verify server component pattern
grep -n "export default async function\|getLocale\|Promise.all" src/app/[locale]/ratings/page.jsx
# Assert: Server component patterns found

# 3. Verify metadata
grep -n "export const metadata" src/app/[locale]/ratings/page.jsx
# Assert: Metadata export found

# 4. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: NO (groups with Task 6)

---

### Task 6: Ratings List Client Component

**What to do**:

- Create `src/app/[locale]/ratings/ratings-list.jsx`
- "use client" directive
- Accept props: `initialTools`, `toolStats`, `locale`
- Implement state: searchQuery, selectedTag, sortBy, viewMode
- Implement useMemo for filtered/sorted tools
- Build UI sections:
  - Hero section with title/subtitle (using translations)
  - Tag filter buttons (8 tags) - clicking filters to that tag
  - Search input, sort dropdown, view toggle
  - Charts section (RatingDistributionChart, TagDistributionChart)
  - Leaderboard section (TOP 10 by clicks this month)
  - Tool cards grid/list with sparklines
- Handle card click to open detail modal

**Must NOT do**:

- Fetch data (received via props)
- Implement detail modal (separate task)
- Add pagination

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Complex UI with charts, filters, cards
- **Skills Evaluated but Omitted**:
  - `playwright`: Not needed during creation

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 5, 7, 8)
- **Blocks**: Task 15
- **Blocked By**: Tasks 2, 3, 4 (needs functions and charts)

**References**:

- `src/app/[locale]/opensource/opensource-list.jsx:1-582` - COMPLETE reference for filtering, sorting, search, grid/list, modal integration
- `src/components/content/social-cards/sparkline-chart.jsx` - SparklineChart import and usage
- `src/components/ui/badge.jsx`, `button.jsx`, `input.jsx`, `select.jsx` - UI components
- `src/components/content/ratings/rating-distribution-chart.jsx` - From Task 3
- `src/components/content/ratings/tag-distribution-chart.jsx` - From Task 4

**WHY Each Reference Matters**:

- `opensource-list.jsx`: THE pattern - copy useState setup, useMemo filter logic, UI structure, then modify for tools
- Chart components: Import and use for visualizations
- UI components: Consistent styling and behavior

**Acceptance Criteria**:

Using Playwright skill for UI verification:

```
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000/ko/ratings
2. Wait for: selector ".tool-card" to be visible (or equivalent)
3. Assert: At least one tool card visible OR empty state message
4. Click: First tag filter button
5. Assert: URL or UI reflects tag filter applied
6. Fill: Search input with "test"
7. Assert: Search is reflected in filter state
8. Screenshot: .sisyphus/evidence/task-6-ratings-list.png
```

**Commit**: YES (with Task 5)

- Message: `feat(ratings): add ratings page with filtering, sorting, and visualizations`
- Files: `src/app/[locale]/ratings/page.jsx`, `src/app/[locale]/ratings/ratings-list.jsx`
- Pre-commit: `npm run build && npm run lint`

---

### Task 7: Tool Detail Modal

**What to do**:

- Create `src/components/content/ratings/tool-detail-modal.jsx`
- Use Radix UI Dialog (existing pattern)
- Accept props: `isOpen`, `onClose`, `tool` (tool data object)
- Display:
  - Tool name, thumbnail, external link button
  - Full description (Korean or English based on locale)
  - Admin rating (star icons)
  - Pros list (green checkmarks)
  - Cons list (red X marks)
  - Larger SparklineChart showing 30-day click trend
  - Pricing badge
  - Tags as badges
- Handle external link click (should record click)

**Must NOT do**:

- User rating UI (deferred)
- Comments/reviews

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Modal with rich content layout
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 5, 6, 8)
- **Blocks**: Task 15
- **Blocked By**: Task 2 (needs click recording function concept)

**References**:

- `src/components/content/social-cards/detail-modal.jsx:1-500` - Existing modal pattern with platform-specific content, SparklineChart usage
- `src/components/ui/dialog.jsx` - Radix UI Dialog component
- `src/components/content/social-cards/sparkline-chart.jsx` - For trend chart

**WHY Each Reference Matters**:

- `detail-modal.jsx`: Shows exact pattern for content modals with rich data display
- `dialog.jsx`: The actual Dialog component to use

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify file created
ls -la src/components/content/ratings/tool-detail-modal.jsx
# Assert: File exists

# 2. Verify Dialog usage
grep -n "Dialog\|DialogContent\|DialogHeader" src/components/content/ratings/tool-detail-modal.jsx
# Assert: Radix Dialog components used

# 3. Verify pros/cons display
grep -n "pros\|cons" src/components/content/ratings/tool-detail-modal.jsx
# Assert: Pros and cons sections exist

# 4. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: YES

- Message: `feat(ratings): add tool detail modal with pros/cons and click trend`
- Files: `src/components/content/ratings/tool-detail-modal.jsx`
- Pre-commit: `npm run lint`

---

### Task 8: Click Tracking API Route

**What to do**:

- Create `src/app/api/tools/click/route.js`
- POST endpoint accepting `{ toolId, userId? }`
- Call `recordToolClick()` Supabase function
- Return success/error response
- Handle edge cases (missing toolId)

**Must NOT do**:

- Add rate limiting (can add later)
- Track additional metadata

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - Simple API route following existing patterns
- **Skills Evaluated but Omitted**:
  - None needed

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 5, 6, 7)
- **Blocks**: Task 15
- **Blocked By**: Task 2 (needs recordToolClick function)

**References**:

- `src/app/api/newsletter/route.js:1-50` - API route pattern with error handling
- `src/services/supabase.js` - recordToolClick function

**WHY Each Reference Matters**:

- `newsletter/route.js`: Shows POST handler pattern, NextResponse usage, try/catch

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify file created
ls -la src/app/api/tools/click/route.js
# Assert: File exists

# 2. Verify POST handler
grep -n "export async function POST" src/app/api/tools/click/route.js
# Assert: POST handler exported

# 3. Test endpoint (after dev server running)
curl -X POST http://localhost:3000/api/tools/click \
  -H "Content-Type: application/json" \
  -d '{"toolId": "test-uuid"}'
# Assert: Returns JSON response (success or error about invalid UUID is fine)
```

**Commit**: YES

- Message: `feat(api): add tool click tracking endpoint`
- Files: `src/app/api/tools/click/route.js`
- Pre-commit: `npm run lint`

---

### Task 9: i18n Translations

**What to do**:

- Add `ratings` namespace to `messages/ko.json`
- Add `ratings` namespace to `messages/en.json`
- Include translations for:
  - Page title, hero title, hero subtitle
  - Filter labels (all tags, search placeholder, sort options)
  - Tag names (all 8 tags in both languages)
  - Detail modal labels (pros, cons, visit, rating)
  - Admin page labels (create, edit, delete, form fields)
  - Empty states, loading states
- Add `ratings` to nav namespace in both files

**Must NOT do**:

- Modify any other namespaces
- Add translations for features not being built

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - JSON editing following existing structure
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 10)
- **Blocks**: Tasks 5, 6, 12, 13, 14
- **Blocked By**: None

**References**:

- `messages/ko.json:288-313` - `opensource` namespace pattern
- `messages/en.json:288-313` - English equivalent
- `messages/ko.json:19-33` - `nav` namespace for navigation link

**WHY Each Reference Matters**:

- `opensource` namespace: Shows exact structure for a feature page (title, heroTitle, filters, etc.)
- `nav` namespace: Where to add the navigation link translation

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify Korean translations
grep -n '"ratings"' messages/ko.json
# Assert: ratings namespace found

# 2. Verify English translations
grep -n '"ratings"' messages/en.json
# Assert: ratings namespace found

# 3. Verify nav links added
grep -n '"ratings":' messages/ko.json | head -3
# Assert: nav.ratings key exists

# 4. Verify tag translations
grep -n "바이브코딩\|Vibe Coding" messages/ko.json messages/en.json
# Assert: Tag translations present
```

**Commit**: YES

- Message: `feat(i18n): add Korean and English translations for ratings feature`
- Files: `messages/ko.json`, `messages/en.json`
- Pre-commit: `npm run lint`

---

### Task 10: Navigation Link Addition

**What to do**:

- Edit `src/components/sections/navigation.jsx`
- Add new nav link to `navLinks` array:
  ```javascript
  { name: t("ratings"), path: "/ratings" }
  ```
- Position after "opensource" and before "newsletter"

**Must NOT do**:

- Change any existing nav links
- Add conditional display logic

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - Simple array edit
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 9)
- **Blocks**: Task 15
- **Blocked By**: None (but Task 9 should add the translation)

**References**:

- `src/components/sections/navigation.jsx:31-38` - navLinks array definition

**WHY Each Reference Matters**:

- Exact location to add the new nav link

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify nav link added
grep -n 'ratings' src/components/sections/navigation.jsx
# Assert: ratings path found in navLinks

# 2. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: YES

- Message: `feat(nav): add ratings link to navigation`
- Files: `src/components/sections/navigation.jsx`
- Pre-commit: `npm run lint`

---

### Task 11: Admin Sidebar Link Addition

**What to do**:

- Edit `src/components/admin/admin-sidebar.jsx`
- Add new menu item for Tools management:
  ```javascript
  { name: "Tools", nameKo: "등급표", path: "/admin/tools", icon: FaStar }
  ```
- Position appropriately in the sidebar menu

**Must NOT do**:

- Change existing menu items
- Add sub-navigation

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - Simple array edit following existing pattern
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 2, 3, 4)
- **Blocks**: Task 15
- **Blocked By**: None

**References**:

- `src/components/admin/admin-sidebar.jsx` - Menu items array structure

**WHY Each Reference Matters**:

- Shows the exact format for menu items (name, nameKo, path, icon)

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify sidebar link added
grep -n 'tools\|Tools\|등급표' src/components/admin/admin-sidebar.jsx
# Assert: Tools menu item found

# 2. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: YES

- Message: `feat(admin): add tools management link to admin sidebar`
- Files: `src/components/admin/admin-sidebar.jsx`
- Pre-commit: `npm run lint`

---

### Task 12: Admin Tools List Page

**What to do**:

- Create `src/app/[locale]/admin/tools/page.jsx` (server component)
- Create `src/app/[locale]/admin/tools/tools-list.jsx` (client component)
- Display table of all tools with columns: Name, Rating, Pricing, Featured, Actions
- Add search/filter functionality
- Add "New Tool" button linking to create page
- Add edit/delete action buttons per row
- Delete confirmation dialog

**Must NOT do**:

- Implement create/edit forms (separate tasks)
- Add bulk operations

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: []
  - Follows existing admin list pattern
- **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Not needed - following exact pattern

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4 (with Tasks 13, 14)
- **Blocks**: Task 15
- **Blocked By**: Tasks 2, 9 (needs functions and translations)

**References**:

- `src/app/[locale]/admin/content/page.jsx` - Server component pattern
- `src/app/[locale]/admin/content/content-list.jsx` - Full list pattern with search, table, actions, delete dialog
- `src/services/supabase.js` - fetchAllTools, deleteTool functions

**WHY Each Reference Matters**:

- `content/page.jsx`: Exact server component structure
- `content-list.jsx`: Complete admin list UI with all features to copy

**Acceptance Criteria**:

Using Playwright skill:

```
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000/ko/admin/tools
2. Wait for: admin authentication (may redirect to login)
3. If authenticated: Assert table or empty state visible
4. Assert: "New Tool" button visible
5. Screenshot: .sisyphus/evidence/task-12-admin-tools-list.png
```

**Commit**: NO (groups with Tasks 13, 14)

---

### Task 13: Admin Create Tool Page

**What to do**:

- Create `src/app/[locale]/admin/tools/new/page.jsx`
- Form with fields:
  - name (required), slug (auto-generated from name)
  - description (Korean), description_en (English)
  - link (external URL)
  - thumbnail_url (image URL)
  - admin_rating (1-5 star selector)
  - tags (multi-select or checkboxes for 8 tags)
  - pricing (select: free/paid/freemium)
  - is_featured (switch)
  - pros (array input - add/remove items)
  - cons (array input - add/remove items)
- Submit calls `createTool()` and redirects to list

**Must NOT do**:

- Image upload (URL input only)
- Rich text editor for descriptions

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Complex form with array inputs
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4 (with Tasks 12, 14)
- **Blocks**: Task 15
- **Blocked By**: Tasks 2, 9

**References**:

- `src/app/[locale]/admin/content/new/page.jsx` - Complete create form pattern with multi-field support
- `src/components/ui/input.jsx`, `select.jsx`, `switch.jsx` - Form components

**WHY Each Reference Matters**:

- `content/new/page.jsx`: THE pattern - useState, handleSubmit, form layout, redirect

**Acceptance Criteria**:

Using Playwright skill:

```
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000/ko/admin/tools/new
2. Wait for: Form visible
3. Fill: name input with "Test Tool"
4. Assert: slug field auto-populates
5. Select: admin_rating = 5
6. Select: pricing = "free"
7. Screenshot: .sisyphus/evidence/task-13-admin-create-tool.png
```

**Commit**: NO (groups with Task 14)

---

### Task 14: Admin Edit Tool Page

**What to do**:

- Create `src/app/[locale]/admin/tools/[id]/page.jsx`
- Same form as create, but:
  - Fetch existing tool data on mount using `fetchToolBySlug` or by ID
  - Pre-populate form fields
  - Submit calls `updateTool()` instead of create
  - Include delete button with confirmation
- Handle not found case (redirect to list)

**Must NOT do**:

- Add version history
- Add publish/unpublish (tools are always visible)

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`]
  - Reuses create form with edit logic
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4 (with Tasks 12, 13)
- **Blocks**: Task 15
- **Blocked By**: Tasks 2, 9

**References**:

- `src/app/[locale]/admin/content/[id]/page.jsx` - Edit form pattern with useEffect fetch, form state, update handler

**WHY Each Reference Matters**:

- `content/[id]/page.jsx`: Exact pattern for edit pages with data fetching

**Acceptance Criteria**:

```bash
# Agent runs:
# 1. Verify file created
ls -la src/app/[locale]/admin/tools/[id]/page.jsx
# Assert: File exists

# 2. Verify edit pattern
grep -n "useEffect\|updateTool" src/app/[locale]/admin/tools/[id]/page.jsx
# Assert: Edit patterns found

# 3. Build check
npm run build
# Assert: Exit code 0
```

**Commit**: YES (with Tasks 12, 13)

- Message: `feat(admin): add tools management CRUD pages`
- Files: `src/app/[locale]/admin/tools/page.jsx`, `tools-list.jsx`, `new/page.jsx`, `[id]/page.jsx`
- Pre-commit: `npm run build && npm run lint`

---

### Task 15: Integration Testing & Build Verification

**What to do**:

- Run full build: `npm run build`
- Start dev server and manually verify:
  - Navigation link appears
  - `/ko/ratings` loads without errors
  - Tag filtering works
  - Search works
  - Sort options work
  - Grid/list toggle works
  - Tool card click opens modal
  - Sparklines render (may be empty if no click data)
  - Charts render (may show "no data" states)
  - Admin sidebar shows Tools link
  - `/ko/admin/tools/` loads
  - Create tool form works
  - Edit tool form works
  - Delete tool works
- Fix any integration issues found
- Document any known limitations

**Must NOT do**:

- Add new features
- Change scope

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
- **Skills**: [`playwright`, `frontend-ui-ux`]
  - `playwright`: Comprehensive browser testing
  - `frontend-ui-ux`: UI verification
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 5 (final, sequential)
- **Blocks**: None (final task)
- **Blocked By**: All previous tasks (1-14)

**References**:

- All files created in Tasks 1-14
- `/playwright` skill for browser automation

**WHY Each Reference Matters**:

- All previous tasks' files need verification

**Acceptance Criteria**:

```bash
# Build verification:
npm run build
# Assert: Exit code 0, no errors

# Start dev server for browser tests
npm run dev &
sleep 10
```

Using Playwright skill:

```
# Comprehensive UI test:
1. Navigate to: http://localhost:3000/ko
2. Click: Navigation link "등급표"
3. Assert: URL is /ko/ratings
4. Wait for: Page content loaded

5. Test tag filtering:
   - Click first tag button
   - Assert: Filter applied (URL or UI change)
   - Click same tag again
   - Assert: Filter cleared

6. Test search:
   - Fill search input with "test"
   - Assert: Results filter or show no results

7. Test sort:
   - Change sort dropdown
   - Assert: Order changes

8. Test view toggle:
   - Click grid view button
   - Assert: Grid layout visible
   - Click list view button
   - Assert: List layout visible

9. Test detail modal:
   - Click a tool card (if any exist)
   - Assert: Modal opens with tool details
   - Click close button
   - Assert: Modal closes

10. Navigate to: http://localhost:3000/ko/admin/tools
11. Assert: Admin tools page loads (may require login)

12. Screenshot: .sisyphus/evidence/task-15-integration-complete.png
```

**Commit**: YES

- Message: `chore: verify ratings feature integration`
- Files: Any bug fixes discovered during testing
- Pre-commit: `npm run build`

---

## Commit Strategy

| After Task | Message                                   | Files                      | Verification |
| ---------- | ----------------------------------------- | -------------------------- | ------------ |
| 1          | `feat(db): add tools tables`              | migrations, schema.sql     | lint         |
| 2          | `feat(api): add tools Supabase functions` | supabase.js                | build        |
| 3, 4       | `feat(ui): add chart components`          | chart components           | build        |
| 5, 6       | `feat(ratings): add ratings page`         | page.jsx, ratings-list.jsx | build        |
| 7          | `feat(ratings): add tool detail modal`    | modal component            | lint         |
| 8          | `feat(api): add click tracking`           | API route                  | lint         |
| 9          | `feat(i18n): add translations`            | messages/\*.json           | lint         |
| 10         | `feat(nav): add ratings link`             | navigation.jsx             | build        |
| 11         | `feat(admin): add sidebar link`           | admin-sidebar.jsx          | build        |
| 12, 13, 14 | `feat(admin): add tools CRUD`             | admin tools pages          | build        |
| 15         | `chore: verify integration`               | bug fixes                  | build        |

---

## Success Criteria

### Verification Commands

```bash
# Build succeeds
npm run build  # Expected: Exit 0

# Dev server starts
npm run dev    # Expected: Listening on port 3000

# Lint passes
npm run lint   # Expected: No errors
```

### Final Checklist

- [ ] Database tables created (`tools`, `tool_clicks`, `tool_user_ratings`)
- [ ] Supabase functions working (fetch, create, update, delete, click tracking)
- [ ] Public ratings page loads at `/ko/ratings` and `/en/ratings`
- [ ] Tag filtering, search, and sorting work
- [ ] Grid and list views toggle correctly
- [ ] Tool detail modal opens with pros/cons and sparkline
- [ ] Charts render (rating distribution, tag distribution)
- [ ] Leaderboard section shows top 10 tools
- [ ] Admin can create new tools at `/admin/tools/new`
- [ ] Admin can edit existing tools at `/admin/tools/[id]`
- [ ] Admin can delete tools with confirmation
- [ ] Navigation shows "등급표" link
- [ ] Admin sidebar shows "Tools" link
- [ ] Korean and English translations work
- [ ] `npm run build` passes
- [ ] All "Must NOT Have" items are NOT present
