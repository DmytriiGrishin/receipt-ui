# AGENTS.md — receipt-ui

## Commands

```
npm run dev        # Start Vite dev server (uses mock API by default)
npm run build      # Type-check + production build (tsc -b && vite build)
npm run preview    # Preview production build
```

- **No test framework** is configured. If adding tests, use Vitest (`npm i -D vitest @testing-library/react @testing-library/jest-dom`) and place files as `src/**/*.test.tsx`. Run with `npx vitest` (watch mode) or `npx vitest run -t "test name"` for a single test.
- **No linter/formatter** is configured. TypeScript strict mode catches most issues. If adding one, Prettier + ESLint are the natural fit.

## Project Structure

```
src/
├── api/webhook.ts          # API client (mock/prod switch via WEBHOOK_URL)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── mock/api.ts             # In-memory mock (80 receipts, grouping, stats)
├── pages/                  # Route-level components (Home, Stats, Edit)
├── types/index.ts          # All TypeScript interfaces (barrel file)
├── utils/                  # Helpers (telegram.ts, env.ts)
├── App.tsx                 # Router + bottom nav
├── main.tsx                # Entry point
└── styles.css              # All styles (dark theme fallbacks)
public/
└── telegram-web-app.js     # Local copy of Telegram WebApp SDK
n8n/
├── nodes/                  # n8n Code Node JS scripts
│   ├── auth-validate.js    # HMAC validation + rate limiting
│   ├── action-router.js    # SQL query generation per action
│   ├── stats-queries.js    # Additional stats sub-queries
│   ├── response-formatter.js
│   └── error-handler.js
└── README.md               # n8n workflow setup guide
```

## Code Style (STRICT)

### Formatting
- **No semicolons** — omit everywhere (JS, TS, JSX, CSS)
- **Single quotes** for strings and JSX attributes
- **2-space indentation**
- **No trailing commas** in objects/arrays
- Line length: keep under 120 chars; break long JSX onto multiple lines

### TypeScript
- `strict: true` with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`
- Use `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
- Prefer `interface` over `type` for object shapes; use `type` for unions/literals
- No `any` — use `unknown` or proper types. Exception: Recharts label/formatter props may need `as any` casts due to v3 strictness
- All dates are ISO date strings (`YYYY-MM-DD`), not `Date` objects
- `Receipt.receiptDate` is optional — guard with `item.receiptDate ? ... : ''` before formatting
- Currency: Russian ruble (₽), placed after the amount: `{value.toFixed(2)} ₽`

### Naming
- **Components**: PascalCase (`ReceiptList`, `StatsDashboard`)
- **Hooks**: camelCase with `use` prefix (`useReceipts`)
- **Functions/variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants; `CATEGORIES` is a module-level const
- **CSS classes**: kebab-case, BEM-like (`.list-entry`, `.list-entry-label`)
- **Files**: PascalCase for components, camelCase for utilities/hooks

### Imports
- Relative imports without file extension: `import { x } from '../types'`
- Group imports: React/hooks first, then local modules, then types
- Type imports on separate `import type` lines or inline `import { type X }`

### Component Patterns
- Named exports for all components except `App` (default export)
- Inline types for simple props: `{ entry: ListEntry; onTap: (id: number) => void }`
- Extract prop interfaces only when reused across 3+ components
- Keep components under ~150 lines; extract sub-components for repeated JSX
- Use inline SVGs for icons (not emoji or icon fonts)

### Error Handling
- Mock API throws `Error('Not found')` / `Error('Receipt not found')` for missing items
- API layer does not catch — errors propagate to components
- Components use simple `if (!data) return <empty/loading>` guards
- No error boundaries currently; add them if error UX becomes important
- Use `confirm()` for destructive actions (delete)

### CSS
- Single `src/styles.css` file — no CSS modules or CSS-in-JS
- Dark theme fallbacks; Telegram `--tg-theme-*` variables override when in-app
- Component styles prefixed by component name (`.receipt-list`, `.detail-item`)
- Mobile-first, no media queries (Telegram Mini App is mobile-only)

### n8n Node Scripts (n8n/nodes/*.js)
- No semicolons, 2-space indent, single quotes (matches frontend style)
- Use `$input.all()`, `$input.first()`, `$env.VAR` for n8n runtime access
- Return `[{ json: { ... } }]` from Code nodes
- Log errors with `console.error()` for n8n execution log visibility
- All SQL uses parameterized queries (`$1`, `$2`, etc.)
- Rate limiting: 60 req/min per userId (in-memory, resets on n8n restart)
- Env vars must be set — no fallback defaults for secrets

## Architecture

- `WEBHOOK_URL='/mock'` enables mock mode; any real URL switches to production
- All API calls are POST to a single n8n webhook with `{ action, payload, auth }`
- **CORS avoidance**: requests use `Content-Type: text/plain` (via `fetch`, not axios) to skip preflight — body is still valid JSON
- 6 actions: `list`, `detail`, `create`, `update`, `delete`, `stats`
- Receipt grouping: items with same `receipt` ref form a group; `receipt: null` = standalone
- Grouping happens server-side (CTE-based SQL); pagination applies to groups, not rows
- Bottom nav hides on overlay pages (`/edit`, `/detail`)
- GitHub Pages deployment with `base: '/receipt-ui/'`
- Auth: Telegram initData HMAC with `HMAC_SHA256(botToken, 'WebAppData')` secret key
- **Critical**: `URLSearchParams` treats `+` as space — replace with `%2B` before parsing in n8n
- Telegram WebApp SDK served locally from `public/telegram-web-app.js`
- `axios` is an unused dependency in package.json — do not reintroduce it

## Key API Contracts

### Request Format
```json
{
  "action": "list" | "detail" | "create" | "update" | "delete" | "stats",
  "payload": { ... },
  "auth": { "initData": "<Telegram string>", "token": "" }
}
```

### Response Shapes
- `list` → `{ items: ListEntry[], total: number }`
- `detail` → `{ id, label, date, items: Receipt[] }`
- `create` → `{ id: number }`
- `update` / `delete` → `{ success: boolean }`
- `stats` → `{ totalSpent, count, avgPrice, byCategory[], byMonth[], topItems[] }`

### ListEntry vs Receipt
- `ListEntry` is a grouped summary (what the list shows): id, label, date, total, itemCount, isGroup
- `Receipt` is a raw row (what detail shows): full item data with category, price, etc.
- Clicking a `ListEntry` navigates to `/detail/:id` which fetches `Receipt[]`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_WEBHOOK_URL` | n8n webhook URL | `/mock` |
| `TELEGRAM_BOT_TOKEN` | Bot token (n8n only, for HMAC validation) | — |

Set `VITE_WEBHOOK_URL` in `.env` for local dev or as a GitHub repo secret for deployment.
