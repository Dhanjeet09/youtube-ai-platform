# AutoTube: Product Flow & UX Specification

> **Status:** Draft v1.0  
> **Date:** 2026-06-12  
> **Scope:** Complete frontend redesign based on code audit findings

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Audit Findings Recap & Remediation](#2-audit-findings-recap--remediation)
3. [User Personas & Jobs-to-be-Done](#3-user-personas--jobs-to-be-done)
4. [Shared Component Library](#4-shared-component-library)
5. [Design Tokens & System](#5-design-tokens--system)
6. [State Management Architecture](#6-state-management-architecture)
7. [Page Specifications](#7-page-specifications)
   - [7.1 Dashboard](#71-dashboard)
   - [7.2 Script Generator](#72-script-generator)
   - [7.3 Workflow (Video Pipeline)](#73-workflow-video-pipeline)
   - [7.4 Assets](#74-assets)
   - [7.5 Analytics](#75-analytics)
   - [7.6 Monetization](#76-monetization)
   - [7.7 Settings](#77-settings)
8. [Navigation Flow](#8-navigation-flow)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [API Integration Plan](#10-api-integration-plan)
11. [Migration Plan](#11-migration-plan)
12. [Implementation Priority](#12-implementation-priority)
13. [Open Questions & Risks](#13-open-questions--risks)

---

## 1. Executive Summary

AutoTube is an AI-powered YouTube automation platform that generates, renders, and publishes videos automatically. The current frontend has 10 critical issues identified in the code audit, including simulated pipeline progress, missing error states, dead code, triplicated logic, hardcoded data, and no shared components.

This specification redesigns the entire frontend around **real-time pipeline feedback**, **resilient error handling**, **shared component reuse**, and **proper data flow between pages**. The redesign eliminates the standalone Niche page (merged into Dashboard), adds language/video-type selectors to Script Generator, rewrites Workflow with genuine step-by-step progress, and introduces a state management layer for cross-page data sharing.

---

## 2. Audit Findings Recap & Remediation

| # | Issue | Remediation |
|---|-------|-------------|
| 1 | Workflow pipeline is entirely simulated — animations fake, API called once at end | Each step calls its own API endpoint; poll/polling for real-time status |
| 2 | Missing error states on Dashboard & Monetization | Wrap all fetches in try/catch with `<ErrorMessage />` banner |
| 3 | 13 of 30 API functions never called (dead code) | Remove unused functions from `api.js`; keep only what pages consume |
| 4 | Triplicated functions (`getGradeClass()` in 3 files, `NICHE_OPTIONS` in 2, slider CSS in 2) | Hoist into shared component library (`StatusBadge`, `Slider`, shared constants) |
| 5 | Hardcoded options instead of `getScriptOptions()` API | Call API on ScriptGenerator mount; fall back to defaults if offline |
| 6 | No navigation between Script Generator and Workflow | Add "Generate & Start Pipeline" button that passes script via router state |
| 7 | `alert()`/`confirm()` used instead of styled modals | Replace all with `<ConfirmDialog />` component |
| 8 | Settings page is 60% decorative | Remove non-functional tabs; keep YouTube Auth (real) + Scheduler (stub) + Coming Soon placeholders |
| 9 | No shared components — every page reimplements spinners, cards, error banners | Build 11 shared components (see Section 4) |
| 10 | No state management — each page fetches data independently, no caching | Introduce lightweight context-based state layer with cache keys and TTL |

---

## 3. User Personas & Jobs-to-be-Done

### Persona 1: Alex — The Solo Content Creator
- **Role:** Independent YouTuber running a niche channel
- **Pain:** Spends 6+ hours scripting, recording, and editing each video. Wants to 10x output.
- **Goal:** Enter a topic, get a finished video uploaded to YouTube in < 30 minutes.
- **JTBD:** "When I have a content idea, I want to go from topic to published video in one automated flow, so I can scale my channel without hiring help."

### Persona 2: Priya — The Agency Owner
- **Role:** Runs a YouTube content agency managing 5+ client channels
- **Pain:** Needs to monitor pipeline health, track which videos succeeded/failed, and demonstrate results to clients.
- **Goal:** Dashboard-level visibility into pipeline status, asset management, and performance analytics across channels.
- **JTBD:** "When I manage multiple channels, I want to see pipeline status at a glance and drill into failures, so I can keep client SLAs and fix issues fast."

### Persona 3: Raj — The FIFA World Cup Creator
- **Role:** Niche creator targeting the Indian YouTube audience with football content in Hinglish
- **Pain:** Needs short-form video support (YouTube Shorts) and Hinglish language script generation. Current platform is English-only with long-form focus.
- **Goal:** Generate short, viral-ready content in Hinglish about World Cup matches.
- **JTBD:** "When a match happens, I want to generate a short video in Hinglish within minutes, so I can ride the trending wave before coverage gets saturated."

### Persona 4: Taylor — The Data-Driven Strategist
- **Role:** Content strategist optimizing for RPM and viral scores
- **Pain:** No clear visibility into which niches and content types drive highest revenue and engagement.
- **Goal:** Use analytics and monetization projections to make data-informed content decisions.
- **JTBD:** "When I plan my content calendar, I want to see RPM rankings, viral scores, and earnings projections, so I can prioritize the most profitable niches."

---

## 4. Shared Component Library

All shared components live in `client/src/components/` with consistent props. No page should reimplement these.

### 4.1 Component Catalog

```
components/
  Layout/              ← page shell, sidebar, header
    Sidebar.jsx
    PageHeader.jsx
  Feedback/            ← loading, error, empty, confirm states
    LoadingSpinner.jsx
    ErrorMessage.jsx
    EmptyState.jsx
    ConfirmDialog.jsx
  DataDisplay/          ← cards, badges, tables
    StatCard.jsx
    StatusBadge.jsx
    PipelineStep.jsx
  Navigation/
    TabBar.jsx
  Inputs/
    CustomSelect.jsx    ← keep existing, move to components/inputs/
    Slider.jsx          ← unified range slider (currently duplicated CSS)
```

### 4.2 Component Specifications

#### `<PageHeader title subtitle actionLabel actionIcon onAction />`
- **Purpose:** Consistent page title bar with optional action button
- **Props:**
  - `title: string` (required) — Page heading
  - `subtitle: string` — Subtitle below heading
  - `actionLabel?: string` — Button text
  - `actionIcon?: string` — Emoji prefix
  - `onAction?: () => void` — Click handler
  - `loading?: boolean` — Shows spinner in button
- **States:** Default (title only), With action (title + button), Loading (spinner in button)
- **Layout:** Flex row, title/subtitle stacked left, button right

#### `<StatCard icon label value trend valuePrefix valueSuffix color />`
- **Purpose:** Unified metric display card
- **Props:**
  - `icon: string` — Emoji
  - `label: string` — Metric name
  - `value: string | number`
  - `trend?: 'up' | 'down' | 'neutral'` — Arrow indicator
  - `valuePrefix?: string` — e.g., "$"
  - `valueSuffix?: string` — e.g., "MB"
  - `color?: 'red' | 'green' | 'cyan' | 'orange'` — Header bar color (default: random from palette)
  - `onClick?: () => void`
- **States:** Loading (skeleton pulse), Default (icon + label + value), Error (red border + "—")
- **Layout:** `.glass rounded-2xl p-6` with 2px colored top border

#### `<ErrorMessage message onDismiss variant />`
- **Purpose:** Consistent error banner replacing ad-hoc red divs
- **Props:**
  - `message: string`
  - `onDismiss?: () => void`
  - `variant?: 'error' | 'warning' | 'info'` (default: 'error')
- **Layout:** Flex row, icon left, message center, X button right

#### `<EmptyState icon title description actionLabel onAction />`
- **Purpose:** Consistent empty state with call to action
- **Props:**
  - `icon: string` — Large emoji
  - `title: string` — Heading
  - `description: string` — Subtext
  - `actionLabel?: string` — CTA button text
  - `onAction?: () => void`
- **Layout:** Centered flex column with large icon, title, description, optional button

#### `<ConfirmDialog open title message confirmLabel cancelLabel onConfirm onCancel variant />`
- **Purpose:** Styled modal replacing `alert()` and `confirm()`
- **Props:**
  - `open: boolean`
  - `title: string`
  - `message: string`
  - `confirmLabel?: string` (default: "Confirm")
  - `cancelLabel?: string` (default: "Cancel")
  - `onConfirm: () => void`
  - `onCancel: () => void`
  - `variant?: 'danger' | 'default'` (default: 'default')
- **States:** Closed (not rendered), Open (overlay + centered modal)
- **Behavior:** Escape key closes, click outside overlay closes, focus trap

#### `<StatusBadge status size />`
- **Purpose:** Color-coded grade / status indicator (consolidates 3x `getGradeClass()`)
- **Props:**
  - `status: string` — One of: `VIRAL | HIGH | MEDIUM | LOW | PENDING | ACTIVE | COMPLETE | ERROR`
  - `size?: 'sm' | 'md' | 'lg'` (default: 'md')
- **Mapping:**
  - `VIRAL` → green bg, "Viral"
  - `HIGH` → cyan bg, "High"
  - `MEDIUM` → orange bg, "Medium"
  - `LOW` → red bg, "Low"
  - `PENDING` → gray bg, "Pending"
  - `ACTIVE` → purple bg with pulse, "Active"
  - `COMPLETE` → green bg, "Complete"
  - `ERROR` → red bg, "Error"

#### `<PipelineStep icon label status isLast />`
- **Purpose:** Step indicator for workflow pipeline
- **Props:**
  - `icon: string` — Emoji
  - `label: string` — Step name
  - `status: 'pending' | 'active' | 'complete' | 'error'`
  - `isLast?: boolean` — Hides connector line
- **States:**
  - `pending` → gray circle, dimmed
  - `active` → gradient circle + pulse animation + glow
  - `complete` → green circle + checkmark
  - `error` → red circle + X
- **Layout:** Vertical column with icon circle, label, status text, and connector line to next step

#### `<LoadingSpinner size />`
- **Purpose:** Single spinner implementation (replaces manual spinner divs)
- **Props:**
  - `size?: 'sm' | 'md' | 'lg'` (default: 'md')
- **Layout:** Border-based rotating circle

#### `<TabBar tabs activeTab onChange />`
- **Purpose:** Consistent horizontal tab bar
- **Props:**
  - `tabs: Array<{id, label, icon?, badge?}>`
  - `activeTab: string`
  - `onChange: (id) => void`
- **Layout:** `.glass rounded-2xl p-2 flex gap-2` with gradient active state

#### `<Slider min max step value onChange label valueLabel />`
- **Purpose:** Unified range slider (consolidates 2x CSS-duplicated sliders)
- **Props:**
  - `min, max, step, value: number`
  - `onChange: (val) => void`
  - `label?: string` — Left label
  - `valueLabel?: string` — Right value display
- **Note:** CSS for slider thumb lives in one place (`main.css`), not inline in every page

**Dead code to remove from `api.js`:**
- `getNiches()` — never used (page calls `getNicheStats` + `getBestNiche` directly)
- `getTrends()` — never called
- `getMatchEvents()`, `getMatchEvent()`, `createMatchEvent()`, `sendMatchEvent()` — legacy match features
- `getContentTemplates()`, `getContentTemplate()`, `createContentTemplate()` — legacy template features
- `createWorldCupPipeline()` — dead endpoint

---

## 5. Design Tokens & System

### 5.1 Existing Design Tokens (preserved)

```css
:root {
  --primary: #ff0000;
  --primary-hover: #cc0000;
  --bg-dark: #0a0a0a;
  --accent: #ff0000;
}
```

### 5.2 New Tokens to Add

```css
:root {
  /* Status colors */
  --color-viral: #22c55e;
  --color-high: #06b6d4;
  --color-medium: #f97316;
  --color-low: #ef4444;

  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f97316;
  --color-error: #ef4444;
  --color-info: #06b6d4;

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Animation */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}
```

### 5.3 Glassmorphism Classes (existing, keep as-is)

| Class | Usage |
|-------|-------|
| `.glass` | Primary card background — `rgba(30,30,30,0.7)` + backdrop-blur |
| `.gradient` | Red gradient accent — `linear-gradient(135deg, #ff0000, #ff6b6b)` |
| `.text-gradient` | Red gradient text |
| `.spinner` | Loading spinner (will be wrapped by `<LoadingSpinner />`) |

### 5.4 Skeleton Loaders

- All data-fetching pages show skeleton placeholders during initial load
- StatCards show a pulsing gray gradient (`.animate-pulse bg-white/5 rounded-xl h-[120px]`) while loading
- Tables show 3-5 skeleton rows
- Pipeline step shows skeleton circles + text lines

---

## 6. State Management Architecture

### 6.1 Approach: Lightweight Context Layer (No Redux)

Use React Context + useReducer for cross-page data that must survive navigation. Each page still fetches its own data, but shares:
- Pipeline state (so Dashboard can show live status)
- YouTube auth state (so any page can check connection)
- Generated script (to pass from ScriptGenerator → Workflow)

### 6.2 Three Global Contexts

#### `AppContext` — Application-level state
```js
{
  ytAuth: { authenticated: boolean, loading: boolean, channelName: string },
  pipelineStatus: { active: boolean, currentStep: string, progress: number },
  appError: string | null
}
```

#### `PipelineContext` — Active pipeline state
```js
{
  activePipeline: null | {
    id: string,
    niche: string,
    script: string,
    steps: [
      { id: 1, key: 'topic', name: 'Topic', status: 'pending', logs: [] },
      { id: 2, key: 'script', name: 'Script', status: 'pending', logs: [] },
      { id: 3, key: 'voice', name: 'Voice', status: 'pending', logs: [] },
      { id: 4, key: 'visuals', name: 'Visuals', status: 'pending', logs: [] },
      { id: 5, key: 'render', name: 'Render', status: 'pending', logs: [] },
      { id: 6, key: 'publish', name: 'Publish', status: 'pending', logs: [] }
    ]
  }
}
```

#### `ScriptContext` — Generated script for cross-page handoff
```js
{
  generatedScript: null | { script, title, tags, niche, contentType, ageGroup, language, videoType, wordCount }
}
```

### 6.3 Data Fetching Pattern (Every Page)

```js
// Every data-fetching page follows this pattern:
function Page() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getData()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [refetchTrigger])

  // Render: loading ? <Skeleton /> : error ? <ErrorMessage /> : data ? <Content /> : <EmptyState />
}
```

### 6.4 Cache Strategy (Phase 2)

In a follow-up iteration, add a simple in-memory cache layer:
```js
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchWithCache(key, fetcher) {
  if (cache.has(key) && Date.now() - cache.get(key).timestamp < CACHE_TTL) {
    return cache.get(key).data
  }
  const data = await fetcher()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

---

## 7. Page Specifications

### 7.1 Dashboard

**Before:** Sparse — 4 stat cards, recommendation bar, niche table. Errors silently swallowed. No pipeline status, no recent videos, no quick action.

**After:** Full command center with real-time pipeline visibility.

#### Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  [PageHeader title="Dashboard" subtitle="AutoTube Overview" │
│   actionLabel="+ New Video" onAction→/generator]            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Total │ │Uploaded  │ │Scheduled │ │ Failed   │          │
│  │Videos │ │          │ │          │ │          │          │
│  ├──────┤ ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ Views │ │Followers │ │Viral     │ │Best      │          │
│  │       │ │          │ │Score     │ │Niche     │          │
│  └──────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────┤
│  [Live Pipeline Status Card]                                │
│  Shows: [Topic] → [Script] → [Voice] → [Visuals] →         │
│         [Render] → [Publish]                               │
│  Or: "No active pipeline. Click 'Create New Video' to start"│
│  (Only shown when pipelineContext.activePipeline !== null)   │
├─────────────────────────────────────────────────────────────┤
│  [Recent Videos Table]                                      │
│  Columns: Thumbnail | Title | Niche | Views | Score | Grade │
│  Status | Created | Actions (View / Retry)                  │
│  Max 10 visible, scrollable, links to /analytics?videoId=X  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ Top Niche Performance│  │ Quick Stats (Revenue,        │ │
│  │ (merged Niche widget)│  │  Projections, Affiliate)     │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### API Calls

| Call | When | Purpose |
|------|------|---------|
| `getAssetStats()` | On mount | Video counts for stat cards |
| `getNicheStats()` | On mount | Niche performance data |
| `getBestNiche()` | On mount | Highlight best niche |
| `getNicheHealth()` | On mount | System health recommendation (NEW) |
| `getAnalytics()` | On mount | Aggregate analytics for dashboard metrics |
| Poll `pipelineStatus` | Every 10s if active | Live pipeline progress |

#### Data Flow

```
Mount → Parallel fetch all 5 APIs
     │
     ├── Success → Populate StatCards, NicheWidget, RecentVideos
     │
     └── Failure → Show <ErrorMessage /> per failed section (not global toast)
```

#### User Stories

1. **As Alex**, I want to see total videos, views, and viral score at a glance so I know how my channel is performing.
2. **As Priya**, I want to see if a pipeline is actively running so I can monitor progress without navigating away.
3. **As Priya**, I want to see the last 10 videos with their status and grade so I can spot failures quickly.
4. **As Taylor**, I want to see top niche performance in a widget so I know where to focus content creation.

#### Acceptance Criteria

**Scenario: Dashboard loads with data**
- Given user navigates to "/"
- When all API calls succeed
- Then stat cards show real values, niche widget populates, recent videos table renders
- And loading skeletons replace with content

**Scenario: API call fails**
- Given user navigates to "/"
- When one API call fails (e.g., `getNicheStats` returns 500)
- Then the failed section shows `<ErrorMessage variant="warning">`
- And other sections continue to render with successful data

**Scenario: Pipeline is running**
- Given a pipeline is active in `PipelineContext`
- When Dashboard mounts or polls
- Then Live Pipeline Status card appears showing current step with animated indicator

---

### 7.2 Script Generator

**Before:** Hardcoded content types/age groups. No language or video type selector. No navigation to Workflow. Slider CSS duplicated.

**After:** Dynamic options from API, language/video-type support, seamless handoff to Workflow.

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [PageHeader title="Content Generator" subtitle="AI Powered"│
│   actionLabel="Use Saved Draft" (if script exists)]         │
├─────────────────────────────────────────────────────────────┤
│  [Topic Input]                                              │
│  ┌──────────────────────────────────────────────────┐[GENERATE]│
│  │  e.g., "butterfly, friendship, space..."         │         │
│  └──────────────────────────────────────────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  [Content Type Grid — fetched from getScriptOptions()]      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │Script│ │Poem  │ │Story │ │Facts │ │Rhyme │ ...           │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Target       │ │ Content      │ │ Language + Type    │  │
│  │ Audience     │ │ Length       │ │ [English/Hinglish] │  │
│  │ (Dropdown)   │ │ (Slider)     │ │ [Short / Long]     │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  [Result Section — shown after generation]                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Script preview (max-h-[400px] scrollable)           │   │
│  │  Tags: {contentType} · Age: {age} · {wordCount} wds │   │
│  │  Language: {lang} · Type: {videoType}                │   │
│  │                                                      │   │
│  │  [📋 Copy] [🔄 Regenerate] [▶ Start Pipeline →]    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### API Calls

| Call | When | Purpose |
|------|------|---------|
| `getScriptOptions()` | On mount | Fetch content types + age groups dynamically |
| `generateScript(data)` | On Generate click | Submit topic + options; receive script + metadata |

#### New Fields Added

- **Language selector:** `english` | `hinglish` (passed as `language` in generateScript payload)
- **Video type selector:** `short` | `long` (passed as `videoType` — short = <60s script, long = full script)
- **Word count:** Displayed on result card + used to estimate duration

#### Navigation Handoff

The "Start Pipeline" button does:
```js
navigate('/workflow', {
  state: {
    script: result.script,
    title: result.title || topic,
    niche: result.niche || 'auto',
    contentType: contentType,
    language: language,
    videoType: videoType,
    tags: result.tags || []
  }
})
```

Workflow page reads from `useLocation().state` on mount.

#### User Stories

1. **As Alex**, I want to select a topic and get a ready-to-use script so I don't have to write from scratch.
2. **As Raj**, I want to generate scripts in Hinglish for the FIFA World Cup so my content resonates with the Indian audience.
3. **As Raj**, I want to create Short-form content (<60s) that works for YouTube Shorts.
4. **As Alex**, I want to pass the generated script directly to the pipeline so I don't have to copy-paste.

#### Acceptance Criteria

**Scenario: Generate script successfully**
- Given user enters topic, selects options
- When user clicks Generate
- Then loading spinner shows on button
- When API returns success
- Then result section appears with script preview, word count, metadata
- And "Start Pipeline" button is visible

**Scenario: Navigation to Workflow**
- Given a script has been generated
- When user clicks "Start Pipeline →"
- Then user navigates to /workflow
- And Workflow page shows script in the Script step card (pre-filled, not regenerated)

**Scenario: getScriptOptions fails**
- Given backend is unreachable
- When ScriptGenerator mounts
- Then fall back to hardcoded defaults (the current CONTENT_TYPES and AGE_GROUPS)
- And show subtle warning: "Using offline defaults"

---

### 7.3 Workflow (Video Pipeline)

**Before:** All steps are simulated animations; single API call at the end; no retry; no per-step cards.

**After:** Real step-by-step execution with individual API calls, real-time logs, retry capability, and YouTube upload integration.

#### Pipeline Steps (Reordered vs Current)

| # | Step | Key | API Call | Real? | Notes |
|---|------|-----|----------|-------|-------|
| 1 | Topic | `topic` | `getBestNiche()` | Yes | Select/confirm niche |
| 2 | Script | `script` | `generateScript()` | Yes | Use existing script from /generator or generate fresh |
| 3 | Voice | `voice` | `voiceService` TBD | Future | Call voice generation API |
| 4 | Visuals | `visuals` | `thumbnailService` / stock footage | Future | Fetch/download media |
| 5 | Render | `render` | `renderService` / FFmpeg | Yes | Render final video |
| 6 | Publish | `publish` | `uploadToYouTube()` | Yes | Upload to YouTube |

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [PageHeader title="Video Pipeline" subtitle="Real-time"]   │
├─────────────────────────────────────────────────────────────┤
│  [Pipeline Steps Horizontal Bar]                            │
│  [Topic] → [Script] → [Voice] → [Visuals] → [Render] → [Pub]│
│  Each step: icon circle + label + status (colored dot)      │
│  Connector lines between steps (green if complete)          │
├─────────────────────────────────────────────────────────────┤
│  [Active Step Card — changes based on current step]        │
│  Shows: step-specific controls + status + action buttons    │
│                                                             │
│  Example — Script step active:                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ✍️ Script Generation                                │   │
│  │  Script: [prefilled from /generator or auto-gen]     │   │
│  │  [✓ Regenerate] [Continue to Voice →]               │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [Live Logs Panel — monospace, scrollable]                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [10:32:01] ✓ Best niche selected: Finance           │   │
│  │  [10:32:03] ✍️ Generating script...                  │   │
│  │  [10:32:05] ✓ Script generated (245 words)           │   │
│  │  [10:32:06] 🎤 Generating voice...                   │   │
│  │  [10:32:12] ❌ Voice generation failed — API timeout  │   │
│  │  [10:32:13] ← Click "Retry" to re-run voice step     │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [Controls Footer]                                          │
│  [⏹ Cancel Pipeline] [↻ Retry Failed Step] [▶ Run All]    │
└─────────────────────────────────────────────────────────────┘
```

#### Execution Flow (Not Simulated)

```
User clicks "Run Pipeline"
  │
  ├─ Step 1: Topic
  │    ├─ API: getBestNiche()  (or use preselected niche)
  │    ├─ Status: pending → active → complete
  │    └─ Log: success/failure
  │
  ├─ Step 2: Script
  │    ├─ Input: from /generator navigation state OR generated fresh
  │    ├─ API: generateScript() if not passed via state
  │    └─ Log: success/failure
  │
  ├─ Step 3: Voice   ─────── (PLACEHOLDER — shows "Coming Soon")
  │    ├─ API: Not yet implemented
  │    └─ Status: manually marked complete (with note)
  │
  ├─ Step 4: Visuals ─────── (PLACEHOLDER — shows "Coming Soon")
  │    ├─ API: Not yet implemented
  │    └─ Status: manually marked complete
  │
  ├─ Step 5: Render
  │    ├─ API: POST /pipeline/run (with forceNiche, quality, script text)
  │    └─ Note: This is where the actual backend processing happens
  │
  └─ Step 6: Publish
       ├─ API: uploadToYouTube({ title, description, filePath, tags })
       └─ Status: Requires YouTube auth; else shows "Connect YouTube to publish"
```

#### Retry Logic

- Each step has its own "Retry" button when status = `error`
- Retry re-calls only that step's API (not the entire pipeline)
- If step 3 fails, user can fix and retry without restarting steps 1-2
- "Cancel Pipeline" button kills the entire process and resets all steps to `pending`

#### Error Recovery

| Error Scenario | UX Response |
|---------------|-------------|
| API timeout on voice step | Step shows ❌ Error; Retry button appears |
| YouTube auth missing | Step shows ⚠️ "Connect YouTube to publish"; Settings link |
| Render fails (bad params) | Error log shown; Retry with modified settings |
| Network offline | "Pipeline paused — waiting for network..." banner with auto-retry |

#### User Stories

1. **As Alex**, I want to see real progress as each step completes so I know the pipeline isn't stuck.
2. **As Priya**, I want to retry individual failing steps without restarting the entire pipeline so I save time.
3. **As Alex**, I want to see detailed logs so I can debug failures myself.
4. **As Raj**, I want the script from the Generator page to be automatically available here.
5. **As Priya**, I want to upload the final video to YouTube directly from the pipeline.

#### Acceptance Criteria

**Scenario: Full pipeline runs successfully**
- Given Script has been passed from /generator via navigation state
- When user clicks "Run Pipeline"
- Then each step activates sequentially with real API calls
- Then progress bar advances to 100%
- Then final result card shows video ID + link to Assets
- And log panel shows all step completions

**Scenario: Single step fails**
- Given pipeline is running
- When step 3 (Voice) API returns error
- Then that step shows error status (red circle)
- Then pipeline pauses at this step
- Then Retry button appears
- When user clicks Retry
- Then step re-executes independently

**Scenario: Script passed from Generator**
- Given user navigated from /generator with script in location.state
- When Workflow mounts
- Then Script step card shows "Script pre-loaded from Generator"
- And script preview is visible in the step card
- Then pipeline can skip script generation step

---

### 7.4 Assets

**Before:** Uses `alert()`/`confirm()`. No media preview. No auto-refresh.

**After:** Styled confirmations, in-page media player, auto-refresh after pipeline completes.

#### Changes from Current

| Current | New |
|---------|-----|
| `confirm()` on delete | `<ConfirmDialog variant="danger">` |
| `alert()` on error | `<ErrorMessage />` |
| Static emoji icon for media | Clickable preview that plays audio/video in-page |
| Manual refresh button | Auto-refresh when pipeline signals completion via event or polling |
| 5 tabs with repeated styling | Shared `<TabBar />` component |

#### Layout (Minor Updates to Existing)

- Replace `confirm()` → `<ConfirmDialog />`
- Replace `alert()` → `<ErrorMessage />`
- Add click-to-preview on asset cards (open modal with `<audio>` or `<video>` element)
- Add auto-refresh via context or event: if pipeline just completed → call `loadAssets()`

#### User Stories

1. **As Alex**, I want to preview generated audio/video in-page so I can verify quality before publishing.
2. **As Priya**, I want a styled confirmation before deleting so I don't accidentally lose assets.
3. **As Alex**, I want assets to refresh automatically after a pipeline run.

#### Acceptance Criteria

**Scenario: Delete asset with confirmation**
- Given user is on Assets page
- When user clicks Delete on an asset
- Then `<ConfirmDialog>` opens with "Delete this file?" + Cancel/Confirm
- When user confirms
- Then API call deletes asset
- Then asset list refreshes

**Scenario: Auto-refresh after pipeline**
- Given a pipeline just completed (detected via context or polling)
- When Assets page is visible
- Then assets list auto-refreshes within 5 seconds

---

### 7.5 Analytics

**Before:** Single video lookup only. No channel-level view. No charts.

**After:** Channel-level analytics dashboard with Viral Score gauge, performance charts, and video lookup.

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [PageHeader title="Analytics" subtitle="Performance Data"] │
├─────────────────────────────────────────────────────────────┤
│  [Channel Overview Stats — 4 cards]                        │
│  Total Views | Subscribers | Avg Viral Score | Top Grade   │
├─────────────────────────────────────────────────────────────┤
│  [Viral Score Gauge — NEW]                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         ╔══════════════════════════════╗             │   │
│  │         ║    Viral Score: 72/100       ║             │   │
│  │         ║    ┌──────────────────┐      ║             │   │
│  │         ║    │   Visual Gauge   │      ║             │   │
│  │         ║    │   0───█───100    │      ║             │   │
│  │         ║    └──────────────────┘      ║             │   │
│  │         ╚══════════════════════════════╝             │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [Video Lookup — existing]                                 │
│  Enter Video ID → Fetch Analytics → Display Stats          │
├─────────────────────────────────────────────────────────────┤
│  [Performance Chart — placeholder]                         │
│  "Charting coming soon — views over time"                  │
├─────────────────────────────────────────────────────────────┤
│  [Recent Searches — existing]                              │
└─────────────────────────────────────────────────────────────┘
```

#### API Calls

| Call | When | Purpose |
|------|------|---------|
| `getAnalytics()` | On mount (channel overview) | Aggregate channel metrics |
| `getAnalytics(videoId)` | On video ID submit | Per-video analytics |
| `getNicheStats()` | On mount | Niche-level performance for breakdown |

#### User Stories

1. **As Taylor**, I want to see my channel's overall Viral Score with a visual gauge so I can quickly assess content performance.
2. **As Alex**, I want to look up individual video analytics by ID so I can track specific content.
3. **As Taylor**, I want to see which niches perform best so I can adjust my content strategy.

---

### 7.6 Monetization

**Before:** Functional but missing `getAffiliateCTA()` call. Silent error handling.

**After:** Added affiliate CTA section. Proper error states. Revenue breakdown by niche.

#### Layout (Additions to Existing)

Add a third column below the calculator/niches row:

```
┌─────────────────────────────────────────────────────────────┐
│  [PageHeader title="Monetization" subtitle="Rev Projections"]│
├─────────────────────────────────────────────────────────────┤
│  [4 Stat Cards — unchanged]                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐  │
│  │ Earnings    │ │ High RPM    │ │ Affiliate CTA        │  │
│  │ Calculator  │ │ Niches      │ │ (NEW — fetched from  │  │
│  │ (unchanged) │ │ (unchanged) │ │  getAffiliateCTA())  │  │
│  │             │ │             │ │  Shows: "Start your  │  │
│  │             │ │             │ │  affiliate journey"  │  │
│  └─────────────┘ └─────────────┘ └──────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  [Revenue Breakdown by Niche — NEW]                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Finance  ████████████░░░  $45.20 │ RPM: $8.50        │   │
│  │ Business ████████░░░░░░░  $32.10 │ RPM: $6.20        │   │
│  │ Tech     ██████░░░░░░░░░  $28.00 │ RPM: $5.80        │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [Revenue Projections — unchanged]                          │
└─────────────────────────────────────────────────────────────┘
```

#### API Calls

| Call | When | Purpose |
|------|------|---------|
| `getHighRpmNiches()` | On mount | Niche RPM rankings |
| `getEarningsEstimate(niche, views)` | On calculator change | Estimate earnings |
| `getEarningsReport()` | On mount | Summary totals |
| `getAffiliateCTA(niche)` | On niche select | Affiliate marketing CTA |

#### User Stories

1. **As Taylor**, I want to see affiliate CTAs per niche so I can diversify revenue streams.
2. **As Alex**, I want to simulate earnings at different view counts so I can set realistic goals.
3. **As Taylor**, I want to see revenue broken down by niche so I know which content earns most.

---

### 7.7 Settings

**Before:** 5 tabs, 60% decorative (General, YouTube, Scheduler, API Keys, Data). Only YouTube tab is functional.

**After:** 3 tabs — YouTube (real functional), Scheduler (controls), About (build info). API Keys and Data removed (no backend support).

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [PageHeader title="Settings"]                              │
├─────────────────────────────────────────────────────────────┤
│  [TabBar: YouTube | Scheduler | About]                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TAB: YouTube (FUNCTIONAL — keep as-is, improve error)     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  YouTube Integration (existing, preserved)            │   │
│  │  Status: Connected / Not Connected                    │   │
│  │  [Connect YouTube Account] button                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  TAB: Scheduler (CONTROLS — make real)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auto-Upload Scheduler                               │   │
│  │  [Toggle: Enable/Disable]                            │   │
│  │  Times: 10:00 AM, 2:00 PM, 6:00 PM (editable)       │   │
│  │  [Save Schedule] [Next Run: Today 2:00 PM IST]       │   │
│  │  Note: Backend scheduler API needed for real control  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  TAB: About (INFO — was General)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AutoTube v1.0.0                                    │   │
│  │  AI-Powered YouTube Automation Platform              │   │
│  │  Backend: Online | Frontend: Online | DB: Connected  │   │
│  │  Built with: React + Tailwind + Node.js             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### API Calls

| Call | When | Purpose |
|------|------|---------|
| `getYouTubeAuthStatus()` | On mount + after auth | Check if YouTube is connected |
| `getYouTubeAuthUrl()` | On Connect click | Get OAuth URL |

#### User Stories

1. **As Alex**, I want to connect my YouTube channel so the pipeline can auto-upload.
2. **As Priya**, I want to see current scheduler settings so I know when the next video will upload.
3. **As Alex**, I want to toggle the scheduler on/off so I control publishing cadence.

---

## 8. Navigation Flow

### 8.1 Sidebar Navigation (Preserved, Minor Update)

```
📊  Dashboard        → /
✨  Script Generator  → /generator
⚡  Workflow          → /workflow
📁  Assets            → /assets
📈  Analytics         → /analytics
💰  Monetization      → /monetization
⚙️  Settings          → /settings
```

**Changes from current:**
- Remove "Niche" from sidebar (merged into Dashboard widget)
- Niche page `/niche` redirects to `/` with a flash message: "Niche data has moved to the Dashboard"

### 8.2 Cross-Page Navigation Flows

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                   DASHBOARD (/)                             │
                    │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
                    │  │ [+ New Vid] │  │ [Pipeline]   │  │ [Video Row]      │   │
                    │  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
                    │         │                │                   │             │
                    └─────────┼────────────────┼───────────────────┼─────────────┘
                              │                │                   │
                              ▼                ▼                   ▼
                    ┌─────────────────┐ ┌────────────┐ ┌──────────────┐
                    │ Script Generator│ │  Workflow  │ │  Analytics   │
                    │   (/generator)  │ │ (/workflow)│ │(/analytics)  │
                    └────────┬────────┘ └────────────┘ │?videoId=xxx  │
                             │                          └──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Workflow     │
                    │  (/workflow)    │
                    │  script from    │
                    │  generator state│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Assets       │
                    │   (/assets)     │
                    │  (auto-refresh) │
                    └─────────────────┘
```

### 8.3 Route Configuration

```jsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/generator" element={<ScriptGenerator />} />
  <Route path="/workflow" element={<Workflow />} />
  <Route path="/assets" element={<Assets />} />
  <Route path="/analytics" element={<Analytics />} />
  <Route path="/monetization" element={<Monetization />} />
  <Route path="/settings" element={<Settings />} />
  {/* Legacy redirect */}
  <Route path="/niche" element={<Navigate to="/" replace />} />
</Routes>
```

---

## 9. Data Flow Diagrams

### 9.1 Dashboard Data Flow

```
useEffect on Mount
       │
       ├─── getAssetStats() ──────► Asset Stats (videos, size)
       ├─── getNicheStats() ──────► Niche performance list
       ├─── getBestNiche() ───────► Best niche object
       ├─── getNicheHealth() ─────► Health + recommendation
       └─── getAnalytics() ───────► Channel-level metrics
       
       │
       ▼
   Parallel Promise.all
       │
       ├── All succeed → Populate all sections
       │
       └── Individual fails → Show ErrorMessage per section
       
Every 10s (if pipeline active):
       │
       └─── Poll pipelineStatus → Update PipelineStep bar
```

### 9.2 Script Generator → Workflow Handoff

```
ScriptGenerator                    Workflow
    │                                │
    ├─ generateScript()              │
    │  └─ return {script, title,     │
    │      tags, niche, contentType, │
    │      ageGroup, language,       │
    │      videoType, wordCount}     │
    │                                │
    ├─ navigate('/workflow', {       │
    │   state: { script, ... }       │
    │ })                             │
    │                                │
    │                           ┌────┘
    │                           ▼
    │                    useLocation().state
    │                           │
    │                    ├── has state → Pre-fill Script step
    │                    └── no state → Show "Generate Script" form
```

### 9.3 Workflow Execution Flow

```
User clicks "Run Pipeline"
       │
       ▼
  Step 1: Topic
       ├─ API: getBestNiche()
       │  OR preselected niche
       ├─ Status: pending → active → complete
       └─ Log: "✅ Topic selected: Finance"
       │
       ▼
  Step 2: Script
       ├─ Input: from navigation state OR generateScript()
       ├─ Status: pending → active → complete
       └─ Log: "✅ Script generated (245 words)"
       │
       ▼
  Step 3: Voice ───────────── [PLACEHOLDER: Mark complete, log "Coming soon"]
       │
       ▼
  Step 4: Visuals ─────────── [PLACEHOLDER: Mark complete, log "Coming soon"]
       │
       ▼
  Step 5: Render
       ├─ API: POST /pipeline/run { niche, script, quality }
       ├─ Status: pending → active → complete/error
       └─ Log: "✅ Video rendered" or "❌ Render failed"
       │
       ▼
  Step 6: Publish
       ├─ Check YouTube auth
       ├─ If authed: POST /youtube/upload { title, desc, file, tags }
       ├─ If not: "⚠️ Connect YouTube to auto-publish"
       └─ Log: "✅ Published to YouTube" or "⚠️ Publish skipped"
```

### 9.4 Assets Page Data Flow

```
Mount → getAssets() + getAssetStats() → Render grid + stats

User clicks Delete → ConfirmDialog
  ├─ Confirm → deleteAsset(filePath) → Refresh list
  └─ Cancel → Close dialog

User clicks "Clear All" → ConfirmDialog (danger variant)
  ├─ Confirm → deleteAllAssets(type) → Refresh list
  └─ Cancel → Close dialog

Pipeline completes (detected via context/polling):
  └─ Auto-refresh within 5 seconds
```

### 9.5 Analytics Data Flow

```
Mount → getAnalytics() (no videoId = channel overview)
       ↓
Render:
  ├─ Channel stat cards (total views, subscribers, etc.)
  ├─ Viral Score gauge
  └─ "Enter video ID for per-video analytics"
       ↓
User enters videoId → getAnalytics(videoId)
       ↓
Render per-video stats + add to recent searches
```

---

## 10. API Integration Plan

### 10.1 Updated API Service (`api.js`)

```js
// api.js — CLEANED VERSION (removed dead code)

import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
})

// Response interceptor with user-facing error extraction
API.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message
                  || error.response?.data?.error
                  || error.message
                  || 'An unexpected error occurred'
    console.error('[API Error]', message)
    return Promise.reject(new Error(message))
  }
)

// === Analytics ===
export const getAnalytics = (videoId) => API.get(`/analytics?videoId=${videoId || ''}`)

// === Niche ===
export const getBestNiche = () => API.get('/niche?type=best')
export const getNicheStats = () => API.get('/niche?type=stats')
export const getNicheHealth = () => API.get('/niche?type=health')
export const registerNiche = (data) => API.post('/niche', data)

// === Pipeline ===
export const createPipeline = (data) => API.post('/pipeline/create', data)
export const runPipeline = (data) => API.post('/pipeline/run', data)

// === YouTube ===
export const getYouTubeAuthUrl = () => API.get('/youtube/auth-url')
export const getYouTubeAuthStatus = () => API.get('/youtube/status')
export const uploadToYouTube = (data) => API.post('/youtube/upload', data)

// === Assets ===
export const getAssets = () => API.get('/assets')
export const getAssetStats = () => API.get('/assets?stats=true')
export const deleteAsset = (filePath) => API.delete('/assets', { data: { filePath } })
export const deleteAllAssets = (type) => API.delete('/assets', { data: { type } })

// === Monetization ===
export const getHighRpmNiches = () => API.get('/monetization?type=niches')
export const getEarningsEstimate = (niche, views) =>
  API.get(`/monetization?type=earnings&niche=${niche}&views=${views}`)
export const getEarningsReport = () => API.get('/monetization?type=report')
export const getAffiliateCTA = (niche) => API.get(`/monetization?type=cta&niche=${niche}`)

// === Script ===
export const getScriptOptions = () => API.get('/script/options')
export const generateScript = (data) => API.post('/script/generate', data)
```

### 10.2 API Calls by Page (Summary Table)

| Page | Mount | User Action | Polling |
|------|-------|-------------|---------|
| Dashboard | `getAssetStats`, `getNicheStats`, `getBestNiche`, `getNicheHealth`, `getAnalytics` | — | Pipeline status (10s) |
| Script Generator | `getScriptOptions` | `generateScript` | — |
| Workflow | — (reads state) | `getBestNiche`, `generateScript`, `runPipeline`, `uploadToYouTube` | — |
| Assets | `getAssets`, `getAssetStats` | `deleteAsset`, `deleteAllAssets` | — |
| Analytics | `getAnalytics()` | `getAnalytics(videoId)` | — |
| Monetization | `getHighRpmNiches`, `getEarningsReport` | `getEarningsEstimate`, `getAffiliateCTA` | — |
| Settings | `getYouTubeAuthStatus` | `getYouTubeAuthUrl` | Auth popup (1s) |

---

## 11. Migration Plan

### Phase 1: Foundation (Build Shared Components)
**Estimated effort:** 2-3 days

1. Create `components/LoadingSpinner.jsx`
2. Create `components/ErrorMessage.jsx`
3. Create `components/EmptyState.jsx`
4. Create `components/StatCard.jsx`
5. Create `components/ConfirmDialog.jsx`
6. Create `components/StatusBadge.jsx`
7. Create `components/PageHeader.jsx`
8. Create `components/PipelineStep.jsx`
9. Create `components/TabBar.jsx`
10. Create `components/Slider.jsx` (consolidates duplicated CSS)
11. Create context files: `contexts/AppContext.jsx`, `contexts/PipelineContext.jsx`, `contexts/ScriptContext.jsx`
12. Clean `api.js` — remove dead code, add `getScriptOptions`
13. Add CSS tokens to `main.css`

### Phase 2: Quick Wins (Fix Critical Issues)
**Estimated effort:** 1-2 days

1. **ScriptGenerator:** Call `getScriptOptions()` on mount, fall back to hardcoded. Add language + video type selectors.
2. **Assets:** Replace `confirm()`/`alert()` with `<ConfirmDialog />` and `<ErrorMessage />`.
3. **Dashboard:** Wrap all fetches in error handling; show `<ErrorMessage />` per failed section.
4. **Monetization:** Add error handling; call `getAffiliateCTA()`.
5. **Settings:** Remove decorative tabs; keep YouTube + Scheduler + About.

### Phase 3: Workflow Rewrite
**Estimated effort:** 3-4 days

1. Rewrite `Workflow.jsx` with per-step API calls (not simulated).
2. Implement `<PipelineStep />` bar with 6 real steps.
3. Add retry logic per step.
4. Add live log panel.
5. Add script receiver from navigation state.
6. Add YouTube upload integration in Publish step.

### Phase 4: Navigation & Data Flow
**Estimated effort:** 1-2 days

1. Add "Start Pipeline →" button in ScriptGenerator that navigates with state.
2. Add "Live Pipeline Status" to Dashboard (reads from PipelineContext).
3. Add Niche → Dashboard integration (remove standalone Niche page, add redirect).
4. Add Assets auto-refresh after pipeline completion.
5. Add channel-level analytics overview to Analytics page.

### Phase 5: Polish & Testing
**Estimated effort:** 2-3 days

1. Add skeleton loaders to all data-fetching pages.
2. Add `<EmptyState />` to pages with no data (Assets, Analytics).
3. Test all error states (API failure, empty response, timeout).
4. Test cross-page navigation flows.
5. Remove all dead code and triplicated functions.
6. Performance audit (memoize components, avoid unnecessary re-renders).

**Total estimated migration effort:** 9-14 days

---

## 12. Implementation Priority

### Tier 1: Critical (Must Do First) — 4 days
These directly fix audit findings and unblock the rest.

| Order | Task | Audit Item |
|-------|------|-----------|
| 1 | Create shared component library (all 11 components) | #9 — No shared components |
| 2 | Clean `api.js` — remove dead 13 functions | #3 — Dead code |
| 3 | Consolidate `getGradeClass()`, `NICHE_OPTIONS`, slider CSS | #4 — Triplicated code |
| 4 | Replace all `alert()`/`confirm()` with `<ConfirmDialog />` | #7 — Styled modals |
| 5 | Add error handling to Dashboard + Monetization | #2 — Missing error states |
| 6 | ScriptGenerator: fetch options from API; add language + type | #5 — Hardcoded options |

### Tier 2: High (Should Do Next) — 5 days
These deliver the core user-facing improvements.

| Order | Task | Value |
|-------|------|-------|
| 7 | Rewrite Workflow with real step-by-step (not simulated) | #1 — Simulated pipeline |
| 8 | Add ScriptGenerator → Workflow navigation handoff | #6 — No navigation |
| 9 | Add Live Pipeline Status to Dashboard | New feature |
| 10 | Merge Niche page into Dashboard widget | UX simplification |

### Tier 3: Medium (Do When Possible) — 3 days
Polishing and completeness.

| Order | Task | Value |
|-------|------|-------|
| 11 | Skeleton loaders on all pages | UX polish |
| 12 | Channel-level analytics + Viral Score gauge | Feature parity |
| 13 | Settings: make Scheduler tab functional | Completeness |
| 14 | Empty states on all pages | UX consistency |

### Tier 4: Low (Future)

| Order | Task | Dependency |
|-------|------|-----------|
| 15 | In-memory cache layer | State management stability |
| 16 | Voice generation step (real API) | Backend voice service |
| 17 | Visuals step (real stock footage) | Backend media service |
| 18 | Performance charts in Analytics | Chart library integration |

---

## 13. Open Questions & Risks

### Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Backend pipeline API doesn't support per-step execution | Workflow still relies on single `POST /pipeline/run` | For MVP, keep one API call but separate step UI; backend team adds per-step endpoints in parallel |
| `getScriptOptions()` may not return enough data to replace hardcoded lists | Script Generator falls back to hardcoded defaults | Build fallback logic into the fetch; keep hardcoded arrays as fallback |
| YouTube OAuth popup blocked by browser | User can't connect YouTube | Add fallback: open in new tab, show instructions to paste redirect URL |
| Scheduler real control requires backend endpoints that don't exist | Scheduler tab stays decorative | Mark tab as "Coming Soon — Backend API required" with clear documentation |
| Pipeline cancellation and retry require backend support for partial state | Retry doesn't actually re-run just one step | For this iteration, "retry" re-runs from the failed step onward (not just the step) |

### Open Questions

1. **Does the backend support polling for pipeline status?** (e.g., `GET /pipeline/:id/status`) — If not, the "real-time" pipeline will still be frontend-driven with simulated wait times between actual API calls. Clarify with backend team.

2. **What is the actual voice generation API?** The current `voiceService.js` exists but isn't exposed via REST. Is there a `POST /voice/generate` endpoint planned?

3. **What is the actual render endpoint?** Currently `POST /pipeline/run` does everything. Will there be `POST /render` and `POST /voice` separate endpoints for step-by-step execution?

4. **Scheduler API**: Do `POST /scheduler/enable`, `POST /scheduler/disable`, `GET /scheduler/status` endpoints exist or need to be built?

5. **Asset preview**: Are audio/video files served with proper `Content-Type` headers so `<audio>` and `<video>` elements can play them in-browser? Need to check the `GET /assets` response and file serving.

6. **Channel-level analytics**: Does `getAnalytics()` without a videoId return aggregate channel data, or does that need a separate endpoint? The current implementation only passes a videoId.

7. **Viral Score calculation**: Is the viral score computed server-side already? What metrics feed into it? (We display it but don't calculate it.)

### Vague or Unmeasurable Requirements Flagged

- **"Smooth transitions between steps"** — Needs specific definition: 300ms CSS transitions? Framer Motion animations? Web Animations API? Recommend: Tailwind `transition-all duration-300` on step cards plus a 500ms delay between step transitions.
- **"Responsive layout"** — Needs breakpoint definition. Current UI uses fixed `grid-cols-4`. Recommend: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for stat cards.
- **"Real-time"** — Needs latency specification. Recommend: poll every 5-10 seconds; "real-time" means "not a single blocking call," not WebSocket-level instant.

---

## Appendix A: File Structure (Post-Migration)

```
client/src/
├── App.jsx                          ← Routes, contexts, sidebar (minor updates)
├── main.jsx                         ← Unchanged
│
├── components/
│   ├── Layout/
│   │   ├── Sidebar.jsx              ← Extract from App.jsx
│   │   └── PageHeader.jsx           ← NEW
│   ├── Feedback/
│   │   ├── LoadingSpinner.jsx       ← NEW (wraps .spinner CSS)
│   │   ├── ErrorMessage.jsx         ← NEW
│   │   ├── EmptyState.jsx           ← NEW
│   │   └── ConfirmDialog.jsx        ← NEW
│   ├── DataDisplay/
│   │   ├── StatCard.jsx             ← NEW
│   │   ├── StatusBadge.jsx          ← NEW (consolidates getGradeClass())
│   │   └── PipelineStep.jsx         ← NEW
│   ├── Navigation/
│   │   └── TabBar.jsx               ← NEW (extracted from Settings/Assets)
│   └── Inputs/
│       ├── CustomSelect.jsx         ← KEEP (move from components/)
│       └── Slider.jsx               ← NEW (consolidates slider CSS)
│
├── contexts/
│   ├── AppContext.jsx               ← NEW — ytAuth, pipelineStatus
│   ├── PipelineContext.jsx          ← NEW — active pipeline state
│   └── ScriptContext.jsx            ← NEW — script handoff
│
├── pages/
│   ├── Dashboard.jsx                ← REWRITE — add error handling, pipeline status, niche widget
│   ├── ScriptGenerator.jsx          ← UPDATE — API options, language/type selectors, navigation
│   ├── Workflow.jsx                 ← REWRITE — real step-by-step, retry, logs, publish
│   ├── Assets.jsx                   ← UPDATE — ConfirmDialog, media preview, auto-refresh
│   ├── Analytics.jsx                ← EXPAND — channel overview, Viral Score gauge
│   ├── Monetization.jsx             ← UPDATE — affiliate CTA, error handling
│   └── Settings.jsx                 ← REDUCE — 3 tabs, remove decorative content
│   [Niche.jsx]                      ← REMOVE — redirected to Dashboard
│
├── services/
│   └── api.js                       ← CLEAN — remove 13 dead functions, add timeout
│
└── styles/
    └── main.css                     ← UPDATE — add CSS tokens, consolidate slider styles
```

---

*End of specification document.*
