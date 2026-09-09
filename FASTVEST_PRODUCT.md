# fastvest --- Product & Engineering Guide

> **fastvest** is a fast, local-first, open-source portfolio tracker for
> people who want to open an app, see their portfolio, and understand
> what is happening immediately.
>
> This document is the **single source of truth for an AI coding agent
> (OpenCode)**. The agent is expected to create the project from
> scratch, install/configure dependencies, implement the product, test
> it, diagnose failures, and continue fixing until the acceptance
> criteria are satisfied.

------------------------------------------------------------------------

## 1. Mission

Build **fastvest**, a standalone portfolio-monitoring PWA.

Core principles:

1.  **Fast first.** Perceived and actual responsiveness matter more than
    decorative animation.
2.  **Local-first.** No account, authentication, database, or cloud
    portfolio storage.
3.  **Simple.** The product exists to monitor a portfolio, not become
    another giant stock-analysis platform.
4.  **Modern.** Use shadcn-vue/Tailwind and a clean interface inspired
    by the existing `easeason` visual language.
5.  **Production-worthy.** Fast does not mean rough: use sensible
    transitions, loading states, empty states, errors, keyboard
    interaction, responsive layouts, accessibility, and good typography.
6.  **Autonomous implementation.** The coding agent should not stop
    after scaffolding. It must implement, test, inspect, fix, and
    re-test.

Reference projects: - `easeason`:
https://github.com/ramadhanep/easeason - `aruna`:
https://github.com/ramadhanep/aruna

Use `easeason` primarily as the visual/UX reference. Do **not** copy
Aruna's complexity.

------------------------------------------------------------------------

# 2. Product Definition

## 2.1 One-sentence pitch

**fastvest lets you track your investment portfolio locally, with live
market prices from Yahoo Finance, without an account.**

## 2.2 Target user

A retail investor who: - already knows their holdings, - wants a quick
dashboard, - does not want to create an account, - does not want a
heavyweight investment platform, - wants portfolio value, allocation,
P&L, and recent market movement in one place.

Primary use case:

> Open fastvest → instantly see portfolio value and P&L → glance at
> holdings → optionally refresh prices → close.

------------------------------------------------------------------------

# 3. Hard Product Constraints

These are non-negotiable.

### No authentication

-   No login.
-   No signup.
-   No OAuth.
-   No user accounts.

### No database

-   No Supabase.
-   No PostgreSQL.
-   No external portfolio persistence.

### Local browser storage only

Portfolio configuration and user preferences live in the browser.

Preferred storage: - Use **IndexedDB** if structured storage becomes
useful. - `localStorage` is acceptable for the MVP if the data model
remains small. - Do not use cookies for portfolio data unless there is a
compelling technical reason. - Theme preference may use localStorage or
the browser's theme preference.

The architecture must make it obvious that portfolio data never needs to
leave the browser.

### Market data

Use `yahoo-finance2` on the Nuxt server side.

Do not call Yahoo Finance directly from browser code.

The browser calls fastvest's Nitro API routes; server routes call
`yahoo-finance2`.

### PWA

fastvest must be installable as a PWA.

### Responsive

Mobile-first, but desktop must feel intentional rather than simply
stretched mobile UI.

### Themes

Support: - Light - Dark - System

The UI must work correctly in both light and dark mode.

------------------------------------------------------------------------

# 4. Technology Stack

Use current stable versions compatible with the project.

## Core

-   Nuxt 4
-   Vue 3
-   TypeScript
-   Nitro server routes
-   Tailwind CSS
-   shadcn-vue
-   Lucide icons
-   `yahoo-finance2`
-   PWA module compatible with Nuxt 4
-   Vitest
-   Playwright

Nuxt 3 must NOT be selected because it reached end-of-life on July 31,
2026.

## Optional libraries

Only add a dependency when it provides clear value.

Potentially useful: - VueUse - `zod` for API/input validation - a
lightweight chart library if a portfolio performance chart is
implemented

Avoid dependency bloat.

------------------------------------------------------------------------

# 5. Visual Direction

fastvest should feel related to `easeason`, not like a generic dashboard
template.

Reference characteristics:

-   clean information hierarchy
-   generous but efficient spacing
-   restrained borders
-   subtle cards
-   strong typography
-   muted secondary text
-   compact controls
-   clean charts
-   dark/light theme support
-   Lucide icons
-   responsive layouts
-   command/search interaction where useful

Do not introduce: - excessive gradients - giant hero sections -
glassmorphism everywhere - excessive shadows - unnecessary animated
backgrounds - decorative animations - dashboard widgets that don't
answer a useful portfolio question

The product should look like a serious financial utility.

------------------------------------------------------------------------

# 6. UX Philosophy

## Speed hierarchy

Optimize in this order:

1.  Instant application shell
2.  Instant local portfolio render
3.  Cached/stale market data
4.  Fresh market data
5.  Secondary charts/details

Never make the whole UI wait for every Yahoo Finance request.

Example:

``` text
App opens
  ↓
Render portfolio from local storage immediately
  ↓
Show cached quotes immediately if available
  ↓
Fetch fresh quotes in background
  ↓
Update changed prices
```

A user should be able to interact with the portfolio while prices
refresh.

## Animation

Use animation only when it communicates state:

-   page transition
-   dropdown/dialog opening
-   row insertion/removal
-   theme transition if tasteful
-   number/value updates if subtle
-   skeleton → content transition

Avoid: - animated cards everywhere - excessive spring animations - long
transitions - animated charts before they are useful

Default transition duration should generally be around 120--220ms.

------------------------------------------------------------------------

# 7. MVP Scope

The first release should focus on the following.

## 7.1 Dashboard

The home page is the portfolio.

Show:

### Portfolio summary

-   Total portfolio value
-   Total invested/cost basis
-   Unrealized P&L
-   Unrealized P&L percentage
-   Today's P&L
-   Today's P&L percentage

If cost basis is unavailable, clearly show the metric as unavailable
rather than inventing it.

### Allocation

Show portfolio allocation by holding.

Example:

``` text
AAPL    35.2%
NVDA    27.4%
MSFT    21.1%
BTC     16.3%
```

A compact donut chart is acceptable.

### Holdings

Each holding row should show:

-   symbol
-   name
-   quantity
-   current price
-   market value
-   average cost
-   P&L
-   P&L %
-   today's change

Mobile: - compact row with essential information - tap to open detail

Desktop: - richer table

Sort options: - portfolio weight - market value - P&L - daily change -
symbol

------------------------------------------------------------------------

# 8. Portfolio Model

A holding should conceptually contain:

``` ts
type Holding = {
  id: string
  symbol: string
  quantity: number
  averageCost: number
  currency?: string
  notes?: string
}
```

Do not over-engineer the model.

The user should be able to:

-   add holding
-   edit holding
-   delete holding
-   duplicate if useful
-   reorder if useful
-   enter fractional shares
-   enter zero-cost holdings if necessary

For MVP, portfolio transactions do not need a full accounting ledger.

The primary model is:

> current quantity + average cost

------------------------------------------------------------------------

# 9. Adding a Holding

Provide a fast flow.

Example:

``` text
+ Add holding

Search symbol...
----------------
NVDA
NVIDIA Corporation

AAPL
Apple Inc.

[Select]

Quantity
Average cost
Currency

[Add holding]
```

Symbol search should use fastvest's API backed by
`yahoo-finance2.search()`.

The search experience should: - debounce input - avoid unnecessary
requests - show useful results quickly - support direct ticker entry -
cache recently searched symbols

Do not require a separate "search page".

A command-palette style dialog is preferred if it remains simple.

------------------------------------------------------------------------

# 10. Holding Detail

Clicking a holding opens a lightweight detail view.

Show:

-   symbol
-   company name
-   current price
-   daily change
-   quantity
-   market value
-   average cost
-   unrealized P&L
-   allocation
-   compact price chart

Chart time ranges:

-   1D
-   1W
-   1M
-   3M
-   6M
-   1Y
-   5Y
-   Max

Do not implement a TradingView-like chart.

This is a portfolio monitor, not a charting terminal.

------------------------------------------------------------------------

# 11. Portfolio Performance

MVP performance view:

-   portfolio value over time
-   optional invested/cost basis comparison
-   selectable range

Possible ranges:

``` text
1W  1M  3M  6M  YTD  1Y  ALL
```

Important:

The first version may calculate historical portfolio value from the
saved holdings using historical market data.

If accurate historical portfolio reconstruction is not possible without
transaction history, do not pretend it is accurate.

Instead: - label the chart clearly, - or defer historical portfolio
performance to a later phase.

Accuracy beats feature count.

------------------------------------------------------------------------

# 12. Market Data API

Create a small, explicit server-side API.

Suggested endpoints:

``` text
GET /api/quotes?symbols=AAPL,NVDA,MSFT
GET /api/search?q=nvidia
GET /api/chart?symbol=NVDA&range=1Y
```

Potential future endpoints:

``` text
GET /api/quote/:symbol
GET /api/market/status
```

Keep the API minimal.

## `/api/quotes`

Input: - comma-separated symbols - validate and normalize symbols -
deduplicate symbols

Return normalized data rather than leaking Yahoo Finance's raw response
shape.

Example:

``` ts
type Quote = {
  symbol: string
  name?: string
  price?: number
  previousClose?: number
  change?: number
  changePercent?: number
  currency?: string
  marketState?: string
  marketTime?: string
}
```

Batch requests whenever possible.

Do not make one Yahoo request per holding if a batch quote call can
satisfy the request.

------------------------------------------------------------------------

# 13. Yahoo Finance Strategy

Use `yahoo-finance2`.

Important: - Yahoo Finance does not provide an official developer API. -
`yahoo-finance2` is an unofficial open-source client. - Handle upstream
failures gracefully. - Never expose raw Yahoo errors to users.

Implement:

### Timeout

Every upstream request must have a reasonable timeout.

### Error normalization

Convert failures into application-level errors:

``` ts
{
  code: "MARKET_DATA_UNAVAILABLE",
  message: "Market data is temporarily unavailable."
}
```

### Partial failure

If 9 holdings succeed and 1 fails:

-   render the 9 successful holdings
-   mark the failed symbol
-   do not make the entire dashboard unusable

### Cache

Implement server-side short-lived quote caching if useful.

Client-side caching should also exist for perceived speed.

Do not create a complicated distributed cache.

------------------------------------------------------------------------

# 14. Local-First Data Architecture

Use a small storage abstraction:

``` text
storage/
  portfolio
  preferences
  quote-cache
  recent-searches
```

The UI must not directly scatter `localStorage.getItem()` calls
throughout components.

Create a composable/service layer such as:

``` text
usePortfolio()
usePreferences()
useQuoteCache()
```

or equivalent architecture.

The exact naming is up to the agent.

Requirements:

-   schema version
-   migration mechanism
-   safe JSON parsing
-   corrupted-data recovery
-   clear/reset portfolio function
-   export portfolio
-   import portfolio

------------------------------------------------------------------------

# 15. Backup / Restore

Because there is no account or database, users need a way to move their
data.

Implement:

### Export

Download:

``` text
fastvest-portfolio.json
```

Example:

``` json
{
  "version": 1,
  "exportedAt": "2026-09-06T00:00:00.000Z",
  "holdings": []
}
```

### Import

Allow the user to select a JSON file.

Validate it.

Never blindly overwrite existing data.

Show confirmation:

``` text
Import portfolio?

This will replace your current local portfolio.

[Cancel] [Import]
```

------------------------------------------------------------------------

# 16. Settings

Keep settings intentionally small.

Settings page/dialog:

-   theme: System / Light / Dark
-   default currency/display preference if needed
-   refresh interval
-   export data
-   import data
-   reset portfolio
-   about
-   Yahoo Finance data disclaimer

Do not build a huge settings system.

------------------------------------------------------------------------

# 17. Refresh Behavior

Provide:

-   manual refresh button
-   last updated timestamp
-   automatic refresh while app is active

Default refresh interval:

``` text
60 seconds
```

Do not continuously refresh when: - browser tab is hidden - app is
offline - no portfolio exists

When returning to the tab: - determine whether cached data is stale -
refresh if appropriate

------------------------------------------------------------------------

# 18. Offline Behavior

fastvest should remain useful without network access.

Offline:

-   local portfolio remains visible
-   cached prices remain visible
-   show a small offline indicator
-   disable/avoid unnecessary refresh calls
-   never blank the dashboard

Example:

``` text
Offline · Showing cached prices
```

When network returns: - refresh quietly - remove the offline indicator

------------------------------------------------------------------------

# 19. PWA

fastvest must be installable.

Requirements:

-   manifest
-   icons
-   app name: fastvest
-   short name: fastvest
-   theme colors
-   standalone display
-   service worker
-   application shell caching

Do not claim that financial market data works fully offline.

Only the app shell and cached data should be available offline.

------------------------------------------------------------------------

# 20. Responsive Layout

## Mobile

Primary navigation can be a compact bottom navigation if needed.

Suggested:

``` text
Portfolio
Watchlist
Settings
```

But do not add Watchlist unless it is actually implemented.

For MVP, a single Portfolio page plus Settings is acceptable.

## Desktop

Use a centered content container.

Suggested structure:

``` text
┌─────────────────────────────────────────────┐
│ fastvest                 Refresh   Theme    │
├─────────────────────────────────────────────┤
│                                             │
│ Portfolio Value                             │
│ $24,821.32       +$482.10  +1.98%           │
│                                             │
│ ┌─────────────────┐ ┌─────────────────────┐ │
│ │ Performance     │ │ Allocation          │ │
│ │ chart           │ │ donut               │ │
│ └─────────────────┘ └─────────────────────┘ │
│                                             │
│ Holdings                                    │
│ AAPL   10   $...   +...                    │
│ NVDA   15   $...   +...                    │
│ MSFT   12   $...   -...                    │
│                                             │
└─────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 21. Empty State

First launch must be excellent.

Show:

``` text
Your portfolio is empty

Add your first holding to start tracking your investments.

[+ Add holding]
```

Do not show fake data by default.

A small example/demo mode may exist only if clearly opt-in.

------------------------------------------------------------------------

# 22. Loading UX

Never use a full-screen spinner for ordinary quote refreshes.

Use:

-   skeletons on first load
-   stale cached values while refreshing
-   subtle refresh indicator
-   disabled state only where necessary

Example:

``` text
$24,821.32   ↻
```

The existing value should remain visible during refresh.

------------------------------------------------------------------------

# 23. Error UX

Errors should be recoverable.

Examples:

### Market data unavailable

``` text
Market data is temporarily unavailable.

Showing your last cached prices.

[Retry]
```

### Invalid symbol

``` text
We couldn't find that symbol.
```

### Storage corruption

``` text
fastvest couldn't read your saved portfolio.

[Restore from backup] [Reset local data]
```

Do not show stack traces.

------------------------------------------------------------------------

# 24. Performance Requirements

Performance is a first-class feature.

Target:

### Initial shell

-   render immediately
-   no unnecessary blocking network requests

### Local portfolio

-   render synchronously/as soon as hydration permits

### Quote refresh

-   batch requests
-   deduplicate symbols
-   avoid duplicate concurrent requests
-   cache results

### UI

-   avoid unnecessary component re-renders
-   use computed state efficiently
-   do not mount large hidden component trees
-   lazy-load secondary chart/detail functionality where appropriate

### Bundle

-   keep dependencies lean
-   do not install a UI animation library unless it provides real value
-   avoid giant icon bundles
-   import only what is used

------------------------------------------------------------------------

# 25. Accessibility

Required:

-   semantic HTML
-   keyboard-accessible dialogs
-   visible focus states
-   proper labels
-   sufficient contrast
-   `aria-label` where icon-only buttons are used
-   keyboard escape for dialogs
-   screen-reader friendly loading/error states

Do not sacrifice accessibility for compactness.

------------------------------------------------------------------------

# 26. Architecture

Suggested structure:

``` text
fastvest/
├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── portfolio/
│   │   ├── holdings/
│   │   ├── charts/
│   │   └── layout/
│   ├── composables/
│   ├── pages/
│   │   ├── index.vue
│   │   └── settings.vue
│   ├── lib/
│   └── assets/
├── server/
│   ├── api/
│   │   ├── quotes.get.ts
│   │   ├── search.get.ts
│   │   └── chart.get.ts
│   ├── services/
│   │   ├── yahoo-finance.ts
│   │   └── cache.ts
│   └── utils/
├── shared/
│   ├── types/
│   └── schemas/
├── public/
│   └── icons/
├── tests/
│   ├── unit/
│   └── e2e/
├── .opencode/
├── components.json
├── nuxt.config.ts
├── package.json
├── PRODUCT.md
└── README.md
```

The agent may adjust this structure when Nuxt conventions or performance
considerations justify it.

Avoid unnecessary abstraction.

------------------------------------------------------------------------

# 27. State Architecture

Use local reactive state with a small number of composables.

Suggested domains:

``` text
portfolio state
preferences state
market data state
connection state
```

Do not introduce Pinia unless state complexity genuinely requires it.

For this product, composables are likely enough.

------------------------------------------------------------------------

# 28. Data Flow

``` text
                    ┌──────────────────────┐
                    │ Browser Local Storage │
                    │ Portfolio + Settings │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   fastvest Nuxt App  │
                    │     Vue / UI State   │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │                      │
                    ▼                      ▼
             local quote cache       Nitro API
                                          │
                                          ▼
                                  yahoo-finance2
                                          │
                                          ▼
                                    Yahoo Finance
```

Portfolio data must never be persisted server-side.

------------------------------------------------------------------------

# 29. Security / Privacy

This is a local portfolio tracker.

Rules:

-   Never log holdings to the server.
-   Never send portfolio contents to analytics.
-   Never add analytics by default.
-   Never add tracking pixels.
-   Never store portfolio data in server sessions.
-   Never put portfolio data into URLs.
-   Never expose local portfolio data through API routes.
-   API routes should receive only market-data requests.

Document clearly:

> Your portfolio is stored locally in this browser. Clearing browser
> storage can delete your portfolio unless you exported a backup.

------------------------------------------------------------------------

# 30. Disclaimer

Use a concise disclaimer:

> fastvest is a portfolio monitoring tool, not financial advice. Market
> data is provided through Yahoo Finance and may be delayed, incomplete,
> or unavailable. Verify important information with your broker or other
> authoritative sources.

Do not overdo legal copy.

------------------------------------------------------------------------

# 31. MCP / AI Development Setup

The project should be optimized for AI-assisted development.

## Required MCP

### shadcn MCP

Configure the shadcn MCP server so OpenCode can discover/install
components from the shadcn registry.

The current shadcn MCP supports browsing/searching/installing registry
components and explicitly supports OpenCode configuration.

Use the official shadcn MCP documentation as the source of truth.

### yahoo-finance2 MCP

`yahoo-finance2` ships an MCP server exposing read-only financial tools
including:

-   quote
-   quoteCombine
-   search
-   quoteSummary
-   chart
-   historical
-   options
-   trendingSymbols
-   screener
-   recommendationsBySymbol
-   insights
-   fundamentalsTimeSeries

Configure it for the coding agent if OpenCode can consume MCP servers.

Purpose:

-   inspect API capabilities while implementing
-   validate symbols
-   explore response shapes
-   debug market-data assumptions

Important: MCP is a development/agent tool. The fastvest runtime should
still use the normal `yahoo-finance2` npm package through Nuxt server
code.

## Other MCPs

Do not install MCPs just because they exist.

Add Playwright/browser tooling only if it materially improves autonomous
UI verification.

------------------------------------------------------------------------

# 32. Agent Operating Rules

The agent must behave as an autonomous senior full-stack engineer.

## Rule 1 --- Read before coding

Before implementation:

1.  inspect the repository
2.  inspect package manager
3.  inspect installed tooling
4.  inspect existing files
5.  inspect the latest Nuxt/shadcn conventions
6.  inspect `easeason` for visual patterns
7.  use `yahoo-finance2` documentation/source when API behavior matters

Do not blindly copy code from reference projects.

## Rule 2 --- Build in phases

Do not attempt an enormous one-shot implementation.

Implement phase by phase.

After every phase:

1.  run typecheck
2.  run lint
3.  run unit tests
4.  run build
5.  run relevant E2E tests
6.  inspect errors
7.  fix them
8.  repeat until clean

## Rule 3 --- Test manually

The agent must manually exercise the application.

At minimum verify:

-   first launch
-   empty state
-   add holding
-   edit holding
-   delete holding
-   refresh prices
-   invalid symbol
-   Yahoo failure
-   partial quote failure
-   page reload
-   local persistence
-   import
-   export
-   theme toggle
-   mobile viewport
-   desktop viewport
-   PWA build
-   offline shell
-   cached price rendering

Do not claim completion based only on successful compilation.

## Rule 4 --- Performance testing

Measure:

-   initial page load
-   API response behavior
-   quote refresh
-   rendering with 1, 5, 20, and 50 holdings

A portfolio of 50 holdings should remain usable.

## Rule 5 --- Fix root causes

Do not hide errors with: - broad `try/catch` - `any` - disabled
TypeScript checks - ignored lint rules - fake fallback data

Fallbacks are allowed only when they represent a real degraded state.

------------------------------------------------------------------------

# 33. Implementation Phases

## Phase 0 --- Project Bootstrap

Agent tasks:

-   create Nuxt 4 project
-   configure TypeScript
-   configure Tailwind
-   configure shadcn-vue
-   configure PWA
-   configure ESLint
-   configure Vitest
-   configure Playwright
-   configure MCP
-   establish aliases
-   establish folder structure
-   create README
-   create LICENSE
-   create PRODUCT.md

Acceptance:

``` bash
npm run dev
npm run lint
npm run test
npm run build
```

all work.

------------------------------------------------------------------------

## Phase 1 --- Design System

Implement:

-   theme system
-   typography
-   colors
-   spacing
-   buttons
-   cards
-   inputs
-   dialogs
-   dropdowns
-   tables
-   tabs
-   tooltips
-   toast/notifications
-   skeletons

Keep the design system small.

Acceptance:

-   light mode looks intentional
-   dark mode looks intentional
-   components are keyboard accessible
-   no visual regressions across mobile/desktop

------------------------------------------------------------------------

## Phase 2 --- Local Portfolio

Implement:

-   storage abstraction
-   schema/version
-   migration foundation
-   portfolio composable
-   add/edit/delete holdings
-   empty state
-   import/export
-   reset

Acceptance:

-   reload preserves portfolio
-   browser restart preserves portfolio
-   corrupted storage does not crash the app
-   import validation works

------------------------------------------------------------------------

## Phase 3 --- Yahoo Finance Integration

Implement:

-   Yahoo service
-   `/api/quotes`
-   `/api/search`
-   `/api/chart`
-   normalization
-   timeout
-   caching
-   partial failures
-   error mapping

Acceptance:

-   API can retrieve multiple symbols
-   duplicate symbols are deduplicated
-   invalid symbols do not crash batch requests
-   upstream failure is handled cleanly

------------------------------------------------------------------------

## Phase 4 --- Portfolio Dashboard

Implement:

-   summary
-   holdings
-   allocation
-   P&L
-   daily change
-   sorting
-   refresh
-   last-updated state

Acceptance:

-   portfolio renders from local state before network completion
-   cached prices render before fresh prices
-   fresh prices replace stale prices without blocking UI

------------------------------------------------------------------------

## Phase 5 --- Holding Detail

Implement:

-   detail dialog/page
-   compact price chart
-   range selector
-   holding-specific metrics

Acceptance:

-   opening detail does not reload the entire dashboard
-   chart is lazy-loaded if needed
-   mobile interaction is excellent

------------------------------------------------------------------------

## Phase 6 --- Performance View

Implement only if data methodology is correct.

Acceptance:

-   numbers are explainable
-   chart labels are accurate
-   no fake historical portfolio performance

If accurate reconstruction is not possible, explicitly defer the feature
instead of shipping misleading data.

------------------------------------------------------------------------

## Phase 7 --- PWA / Offline

Implement:

-   manifest
-   icons
-   service worker
-   app-shell caching
-   offline indicator
-   cached quote behavior

Acceptance:

-   app can be installed
-   shell loads offline
-   portfolio remains visible offline
-   cached market data remains visible
-   network recovery triggers refresh

------------------------------------------------------------------------

## Phase 8 --- Polish

Perform a complete product pass:

-   spacing
-   typography
-   responsive behavior
-   empty states
-   loading states
-   error states
-   accessibility
-   keyboard navigation
-   mobile ergonomics
-   animation timing
-   performance

No feature expansion during this phase.

------------------------------------------------------------------------

# 34. Testing Requirements

## Unit tests

Cover:

-   portfolio calculations
-   market value
-   P&L
-   allocation
-   formatting
-   storage serialization
-   storage migration
-   API normalization
-   Yahoo error normalization
-   quote deduplication

Example:

``` text
marketValue = quantity × currentPrice

costBasis = quantity × averageCost

unrealizedPnL = marketValue - costBasis

unrealizedPnLPercent =
  costBasis > 0
    ? unrealizedPnL / costBasis × 100
    : undefined
```

Handle zero/negative/invalid inputs deliberately.

## E2E

Cover the critical user journey:

``` text
Open app
→ empty state
→ add AAPL
→ enter quantity/cost
→ dashboard appears
→ refresh
→ reload page
→ holding remains
→ edit
→ delete
→ empty state
```

Also test theme switching and mobile layout.

------------------------------------------------------------------------

# 35. Definition of Done

fastvest is not done when:

-   the page renders
-   the build passes
-   the dashboard looks good

fastvest is done when:

### Product

-   [ ] user can start without login
-   [ ] user can add holdings
-   [ ] user can edit holdings
-   [ ] user can delete holdings
-   [ ] portfolio persists locally
-   [ ] portfolio can be exported
-   [ ] portfolio can be imported
-   [ ] summary metrics work
-   [ ] holdings display current market data
-   [ ] P&L works
-   [ ] allocation works
-   [ ] manual refresh works
-   [ ] automatic refresh works
-   [ ] errors are understandable
-   [ ] offline behavior is useful
-   [ ] dark/light/system themes work
-   [ ] PWA installs

### Engineering

-   [ ] TypeScript passes
-   [ ] lint passes
-   [ ] unit tests pass
-   [ ] E2E tests pass
-   [ ] production build passes
-   [ ] no unnecessary `any`
-   [ ] no dead dependencies
-   [ ] no debug logging
-   [ ] no secrets committed
-   [ ] API errors are normalized
-   [ ] Yahoo requests are server-side
-   [ ] portfolio data never reaches the server

### UX

-   [ ] first paint feels fast
-   [ ] cached portfolio appears immediately
-   [ ] quote refresh does not block interaction
-   [ ] animations are subtle
-   [ ] mobile is first-class
-   [ ] desktop is first-class
-   [ ] keyboard navigation works
-   [ ] loading/error/empty states are polished

------------------------------------------------------------------------

# 36. What fastvest Is NOT

Do not let scope creep turn fastvest into Aruna.

fastvest is NOT:

-   a broker
-   a trading platform
-   a financial advisor
-   a social network
-   a stock screener
-   a research terminal
-   a technical-analysis platform
-   an earnings platform
-   an AI investment advisor
-   a multi-user SaaS
-   a cloud portfolio manager
-   a replacement for a broker

Potential future features must pass this question:

> Does this make portfolio monitoring materially better without making
> fastvest feel heavy?

If not, do not build it.

------------------------------------------------------------------------

# 37. Future Ideas --- Explicitly Deferred

These are not MVP requirements:

-   multiple portfolios
-   dividend tracking
-   transaction ledger
-   realized P&L
-   tax lots
-   dividend reinvestment
-   benchmark comparison
-   portfolio vs S&P 500
-   portfolio vs IHSG
-   advanced historical performance
-   asset classes beyond supported Yahoo instruments
-   watchlist
-   alerts
-   price notifications
-   broker integrations
-   CSV import
-   automatic broker synchronization
-   cloud sync
-   authentication
-   collaboration
-   AI assistant

Do not implement these during MVP unless the product owner explicitly
changes this document.

------------------------------------------------------------------------

# 38. Suggested API Contracts

## Search

``` http
GET /api/search?q=apple
```

Response:

``` json
{
  "results": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NMS",
      "type": "EQUITY"
    }
  ]
}
```

## Quotes

``` http
GET /api/quotes?symbols=AAPL,NVDA,MSFT
```

Response:

``` json
{
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "price": 240.12,
      "previousClose": 238.90,
      "change": 1.22,
      "changePercent": 0.51,
      "currency": "USD",
      "marketState": "REGULAR"
    }
  ],
  "errors": []
}
```

## Chart

``` http
GET /api/chart?symbol=AAPL&range=1Y
```

Response:

``` json
{
  "symbol": "AAPL",
  "currency": "USD",
  "points": [
    {
      "timestamp": 1757030400,
      "close": 240.12
    }
  ]
}
```

The exact response shape may be improved by the agent, but it must
remain stable and normalized.

------------------------------------------------------------------------

# 39. Calculation Rules

Keep financial calculations centralized.

Do not calculate P&L independently in multiple components.

Create pure functions.

Example:

``` ts
export function calculateHoldingMetrics(
  holding: Holding,
  quote: Quote
) {
  const marketValue = holding.quantity * quote.price
  const costBasis = holding.quantity * holding.averageCost
  const pnl = marketValue - costBasis
  const pnlPercent =
    costBasis > 0 ? (pnl / costBasis) * 100 : undefined

  return {
    marketValue,
    costBasis,
    pnl,
    pnlPercent,
  }
}
```

Portfolio totals must be derived from holding metrics.

------------------------------------------------------------------------

# 40. Formatting

Centralize:

-   currency formatting
-   percentage formatting
-   large number formatting
-   quantity formatting
-   timestamps
-   market status

Do not scatter `Intl.NumberFormat` configuration across components.

Support at minimum:

-   USD
-   IDR

The implementation may support additional Yahoo currencies naturally,
but do not build a full FX system for MVP.

------------------------------------------------------------------------

# 41. Market Status

Display market status when useful:

``` text
Market open
Market closed
Pre-market
After-hours
Unknown
```

Do not infer exchange state incorrectly.

If Yahoo data does not provide enough information, show a neutral state.

------------------------------------------------------------------------

# 42. Git / Repository Hygiene

Agent should create:

``` text
README.md
LICENSE
PRODUCT.md
CONTRIBUTING.md
```

Also:

-   `.gitignore`
-   `.env.example` only if environment variables are actually needed
-   no secrets
-   no generated personal portfolio data
-   no local database files

Portfolio data must never be committed.

------------------------------------------------------------------------

# 43. README Requirements

README should explain:

-   what fastvest is
-   screenshots if available
-   features
-   architecture
-   local-first privacy model
-   setup
-   development commands
-   testing
-   PWA
-   Yahoo Finance disclaimer
-   contribution guide
-   license

Include a clear statement:

> fastvest stores portfolio data locally in the user's browser and does
> not require an account.

------------------------------------------------------------------------

# 44. Final Autonomous Agent Loop

After implementing everything, the agent must perform this loop:

``` text
READ PRODUCT.md
      ↓
Inspect implementation
      ↓
Run typecheck
      ↓
Run lint
      ↓
Run unit tests
      ↓
Run production build
      ↓
Run E2E
      ↓
Launch application
      ↓
Manually exercise critical flows
      ↓
Inspect UX on mobile + desktop
      ↓
Inspect console/network errors
      ↓
Fix issues
      ↓
Run everything again
      ↓
Only stop when Definition of Done passes
```

If a test fails:

``` text
Failure
→ reproduce
→ identify root cause
→ fix
→ add/update regression test
→ rerun
```

Do not simply report the failure.

------------------------------------------------------------------------

# 45. Final Product Principle

The winning fastvest experience is:

> **Open → instantly understand → refresh quietly → close.**

It should feel like a small, extremely competent utility rather than a
financial super-app.

When choosing between:

``` text
more features
vs.
faster + simpler
```

choose:

**faster + simpler.**
