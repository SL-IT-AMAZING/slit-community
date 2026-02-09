# Draft: 등급표 (Tool Rating Board) Feature

## Requirements (confirmed)

### User's Goal

- Create a "등급표" (Rating Board/Tool Directory) feature for the AI Community platform
- New page at `/[locale]/ratings` with tool listings, ratings, filtering, and visualizations

### Data Model Requirements

**Table 1: `tools`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| name | TEXT | Tool name |
| slug | TEXT UNIQUE | URL-friendly identifier |
| description | TEXT | Korean description |
| description_en | TEXT | English description |
| link | TEXT | External URL |
| thumbnail_url | TEXT | Tool thumbnail image |
| admin_rating | INTEGER (1-5) | Admin-assigned star rating |
| tags | TEXT[] | Multiple tags for categorization |
| pricing | TEXT | 'free', 'paid', 'freemium' |
| is_featured | BOOLEAN | Featured/recommended flag |
| pros | TEXT[] | Array of pros |
| cons | TEXT[] | Array of cons |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Table 2: `tool_clicks`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| tool_id | UUID (FK) | Reference to tools table |
| clicked_at | TIMESTAMPTZ | Click timestamp (DEFAULT NOW()) |
| user_id | UUID | Optional, for logged-in users |

**Table 3: `tool_user_ratings` (Future)**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| tool_id | UUID (FK) | Reference to tools table |
| user_id | UUID (FK) | Reference to users table |
| rating | INTEGER (1-5) | User rating |
| created_at | TIMESTAMPTZ | Rating timestamp |
| UNIQUE(tool_id, user_id) | | One rating per user per tool |

### Tags (8 categories)

1. UI
2. 바이브코딩 (Vibe Coding)
3. 자동화 (Automation)
4. 기타 (Other)
5. 오픈소스 (Open Source)
6. 개발방법론 (Development Methodology)
7. 클로드 (Claude)
8. 콘텐츠 생성 (Content Creation)

### UI Requirements

- Hero section with title/subtitle
- Tag filter buttons (click to filter by tag)
- Search bar for tool search
- Sort options: rating, clicks, recent, name
- List/Grid view toggle
- Tool cards with: thumbnail, name, rating (stars), tags, sparkline

### Visualizations Required

1. **Sparkline Chart**: 30-day click trend per tool (reuse existing SparklineChart)
2. **Rating Distribution Bar Chart**: Count of tools by star rating
3. **Tag Distribution Donut Chart**: Tool count per tag
4. **Leaderboard Section**: TOP 10 most clicked tools this month

### Detail Modal/Page Requirements

- Full description (Korean/English based on locale)
- Pros/Cons list
- Admin rating display (stars)
- User ratings average (future)
- Larger click trend graph
- External link button

### Admin Page Requirements

- CRUD operations for tools
- Set admin rating
- Manage tags
- View analytics (click stats)

## Technical Decisions

### Follow Existing Patterns

- **Server Component + Client Component pattern**: Like `opensource/page.jsx` + `opensource-list.jsx`
- **Supabase functions in `src/services/supabase.js`**: Add new tool-related functions
- **Navigation**: Add to navLinks array in `navigation.jsx`
- **i18n**: Add translations to `messages/ko.json` and `messages/en.json`
- **Charts**: Use existing pure SVG approach (SparklineChart, SparklineBar)

### New Charts to Build

- **RatingDistributionChart**: Horizontal bar chart showing 5-star: X tools, 4-star: Y tools, etc.
- **TagDistributionChart**: Donut/pie chart showing tool count per tag
- Both should use pure SVG (no external libraries) to match existing patterns

### Route Structure

```
src/app/[locale]/ratings/
├── page.jsx              # Server component (fetch data)
├── ratings-list.jsx      # Client component (filtering/sorting/UI)

src/app/[locale]/admin/tools/
├── page.jsx              # Admin list view
├── new/
│   └── page.jsx          # Create tool form
├── [id]/
│   └── page.jsx          # Edit tool form
```

## Research Findings

### From Codebase Exploration:

**1. Opensource List Pattern** (`opensource-list.jsx`)

- Uses `useState` for search, filter, sort, viewMode
- `useMemo` for filtered/sorted results
- Controls bar with search, select dropdowns, view toggle
- Hero section with Badge and gradient title
- Grid and list view with rank styling
- DetailModal for expanded view

**2. Supabase Service Pattern** (`src/services/supabase.js`)

- Uses `createClient` for read operations
- Uses `getSupabaseAdmin` for privileged operations
- Consistent error handling pattern
- Returns arrays or null/data

**3. Navigation Pattern**

- Array-based navLinks in `navigation.jsx`
- Uses `t("key")` for translations
- Supports `comingSoon` flag

**4. Visualization Pattern**

- Pure SVG-based charts (no external libraries)
- SparklineChart: Line chart with trend percentage
- SparklineBar: Bar chart variant
- MetricsGraphModal: Interactive detailed chart

**5. Admin Pattern**

- Layout with auth check (role === "admin")
- AdminSidebar for navigation
- Form pattern: useState + useEffect for edit mode
- Dialog component for confirmations

## Scope Boundaries

### INCLUDE

- New database tables (tools, tool_clicks, tool_user_ratings)
- Public ratings page with list/grid view
- Tag/search/sort filtering
- Tool detail modal
- Sparkline for click trends
- Rating and tag distribution charts
- Leaderboard section
- Admin CRUD for tools
- i18n support (ko/en)
- Navigation link

### EXCLUDE

- User ratings UI (table created but UI deferred to future)
- Comments/reviews on tools
- Tool comparison feature
- Advanced analytics dashboard
- Tool recommendation engine
- API for external tool submissions

## Open Questions

1. **Route path preference**: `/ratings` or `/tools`? (User mentioned both)
   - DECISION NEEDED from user

## Research Findings - Test Infrastructure

**Test Infrastructure**: DOES NOT EXIST

- No test files found (_.test.js, _.spec.js)
- No test script in package.json
- Only scripts: dev, build, start, lint

**QA Approach**: Manual verification procedures will be used

- Each task will include specific verification commands
- Playwright browser automation for UI verification
- API testing via curl commands

## Research Findings - Click Tracking

**Recommended Approach**: API Route

- Existing pattern in codebase uses API routes for mutations
- Example: `/api/newsletter/route.js` for subscriptions
- Server Actions could work but API routes are more consistent with existing patterns

## Next Steps

1. Clarify route path preference with user
2. Proceed to plan generation when clear
