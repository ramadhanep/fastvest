# FastVest

**Fast, local-first portfolio tracker.** FastVest lets you monitor your investment portfolio with live market prices from Yahoo Finance — without an account, without a database, and without sending your portfolio anywhere.

FastVest stores portfolio data locally in the user's browser and does not require an account. Open the app, see your portfolio value and P&L, glance at your holdings, refresh prices quietly, close.

## Features

- **Portfolio summary** — total value, cost basis, unrealized P&L, and today's P&L
- **Allocation** — compact donut chart of your holdings by market value
- **Holdings table** — price, market value, average cost, P&L, daily change; sortable on desktop, card list on mobile
- **Add / edit / delete holdings** — fractional shares, zero-cost positions, optional currency and notes
- **Symbol search** — debounced, backed by Yahoo Finance, with recently searched symbols
- **Holding detail** — per-symbol metrics and a compact price chart (1D → Max)
- **Live quotes** — batched, cached, stale-while-refresh; never blocks the dashboard
- **Manual + automatic refresh** — 60s default interval, smart about hidden/offline tabs
- **Offline support** — portfolio and cached prices remain visible with an offline indicator
- **Import / export** — move your portfolio as a JSON file; import never silently overwrites
- **Themes** — system / light / dark
- **PWA** — installable, app-shell caching
- **Settings** — intentionally small: theme, refresh interval, export/import, reset, disclaimer

## Privacy model

FastVest is local-first by design:

- Portfolio configuration and preferences live **only in your browser** (localStorage).
- Market data requests go **server-side** through FastVest's Nitro API routes, which call `yahoo-finance2`.
- Your portfolio contents are **never** persisted server-side, logged, or sent to analytics.
- Clearing browser storage deletes your local portfolio unless you exported a backup.

## Tech stack

- Nuxt 4 · Vue 3 · TypeScript
- Nitro server routes
- Tailwind CSS v4 · shadcn-vue · Lucide icons
- `yahoo-finance2` (server-side only)
- PWA via `@vite-pwa/nuxt`
- Vitest (unit) · Playwright (E2E)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Runs on `http://localhost:3000`.

## Quality

```bash
npm run typecheck   # vue-tsc type checking
npm run lint        # ESLint
npm run test        # unit tests (Vitest)
npm run test:e2e    # end-to-end (Playwright)
npm run build       # production build
```

## PWA

The production build generates the service worker, manifest, and icons.

```bash
npm run build
npm run preview
```

FastVest is installable and its app shell loads offline. Live market data does not work fully offline; cached prices remain visible.

## Architecture

```
Browser localStorage ──► Vue/UI state ──► local quote cache
                              │
                              ▼
                        Nitro API routes
                              │
                              ▼
                       yahoo-finance2 (server)
                              │
                              ▼
                         Yahoo Finance
```

Market data flows server-side only; portfolio data never leaves the browser.

Key areas:

- `app/composables/` — `usePortfolio`, `useQuotes`, `useSymbolSearch`, `usePreferences`, `useConnection`
- `app/lib/` — storage abstraction and utilities
- `app/utils/` — centralized financial calculations and formatting
- `server/api/` — `/api/quotes`, `/api/search`, `/api/chart`
- `server/services/` — Yahoo Finance wrapper with timeout, cache, and error normalization
- `shared/` — types and zod schemas shared between client and server

## FAQ

### Is this financial advice?

No. **FastVest is a portfolio monitoring tool, not financial advice.** Market data is provided through Yahoo Finance and may be delayed, incomplete, or unavailable. Verify important information with your broker or other authoritative sources.

### Do I need an account?

No. There is no login, no signup, and no account system.

### Where is my data stored?

In your browser's localStorage. Export a `fastvest-portfolio.json` backup from Settings to move or back it up.

### Why aren't my prices updating?

Market data can be temporarily unavailable (Yahoo Finance has no official API). FastVest keeps your last cached prices visible and lets you retry.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[GPL-3.0](LICENSE)