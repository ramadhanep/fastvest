# Contributing

Thanks for helping with fastvest. Keep it small, local-first, and fast.

## Principles

- **Local-first.** Portfolio data lives in the browser. Never send it to a server, logs, or analytics.
- **Server-side market data only.** Yahoo Finance calls belong in `server/`, never in browser code.
- **Fast + simple.** A feature must make portfolio monitoring materially better without making fastvest feel heavy. When in doubt, leave it out.
- **No auth, no database.** fastvest has neither and should not grow either.

## Setup

```bash
npm install
npm run dev
```

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

All must pass.

## Code style

- TypeScript strict, no unnecessary `any`.
- Financial calculations live in `app/utils/calculations.ts` — do not reimplement P&L in components.
- Formatting lives in `app/utils/format.ts` — no scattered `Intl.NumberFormat` config.
- Storage access goes through `app/lib/storage.ts` and the composables, not bare `localStorage` calls in components.
- Errors from market data are normalized into application-level errors; never leak raw Yahoo errors or stack traces to users.
- Avoid new dependencies unless they provide clear value.

## Tests

- Unit tests: `tests/unit/` (Vitest) — cover calculations, formatting, storage, schemas, API normalization, quote dedup, and error mapping.
- E2E: `tests/e2e/` (Playwright) — cover the critical user journey, theme switching, and mobile layout.
- Add a regression test whenever you fix a bug.

## Reporting bugs

Include: what you did, what you expected, what happened, browser/OS, and whether it was online or offline.

## License

By contributing you agree your work is released under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).