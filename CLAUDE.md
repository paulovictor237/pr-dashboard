# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (SSR via React Router)

# Build & Type Check
npm run build        # Production build
npm run typecheck    # react-router typegen + tsc

# Testing
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode

# Code Quality
npm run format       # Prettier format (ts, tsx)
```

## Architecture

**Stack:** React Router 7 (SSR), React 19, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS v4, next-themes, recharts, sonner, vaul, react-day-picker, react-resizable-panels.

**PR Dashboard app** that authenticates with a GitHub PAT, fetches PRs from selected repos, and groups them into priority categories for a team workflow.

### Data Flow

1. User submits PAT → `/login` action validates against GitHub API → stored in `gh_token` httpOnly cookie (30-day expiry)
2. Protected routes call `requireAuth()` from `lib/auth.server.ts` — redirects to `/login` if no valid token
3. GitHub user data fetched server-side in the route loader
4. Client-side: `useRepos()` manages selected repos in LocalStorage
5. `useDashboard()` (TanStack Query) fetches all PRs + enriches with reviews and check runs
6. `groupPullRequests()` in `lib/pr-groups.ts` is a pure function that assigns PRs to one of 8 groups — first match wins

### PR Groups (priority order)

| Group | Portuguese label | Condition |
|-------|-----------------|-----------|
| Destravar | Unblocked | Reviewed + new activity |
| Inbox | Review requested | Review requested from user |
| Quick Wins | Small PRs | ≤200 lines changed |
| Finalização | Closing | Approved + CI green |
| Stale | Stale | Inactive >5 days |
| Exploração | Catch-all | Everything else |
| Aprovados | Approved | Approved by user |
| Mergeados | Merged | Last 5 merged PRs |

### Key Files

- `lib/github.ts` — GitHub REST API calls (users, PRs, reviews, check runs)
- `lib/github.types.ts` — TypeScript types for GitHub API responses
- `lib/pr-groups.ts` — Pure grouping logic (unit tested)
- `lib/session.server.ts` — Cookie utilities (create/read/clear token)
- `lib/auth.server.ts` — `requireAuth()` middleware, logout headers
- `lib/query-client.ts` — TanStack Query client configuration
- `hooks/use-dashboard.ts` — Main data hook (TanStack Query)
- `hooks/use-repos.ts` — LocalStorage-based repo management
- `components/ui/` — shadcn/ui components (55+ components disponíveis)
- `components/app-sidebar.tsx` — sidebar principal com branding PRIcon

### Path Aliases

`~/` maps to `./app/` (configured in tsconfig.json + vite).

### Testing

Tests live alongside source files (`*.test.ts`). Use happy-dom environment. Focus areas: `pr-groups.ts`, `github.ts`, `session.server.ts`, `use-repos.ts`.

### GitHub API Rate Limits

GitHub API calls are made **client-side** (via TanStack Query) to use the user's IP/token for rate limits — not the server IP.

## UI Components — shadcn/ui

**ALWAYS use shadcn/ui as the component library.** This project has 55+ components already available in `components/ui/`.

### Rules

- **Prefer existing components** — before building anything UI-related, check `components/ui/` for a suitable component.
- **Add missing components via shadcn CLI** — if a component is not yet in the project, add it with `npx shadcn@latest add <component>` rather than creating it manually.
- **Never create custom styled components from scratch** when a shadcn equivalent exists. Avoid writing raw HTML elements with inline Tailwind styling when a primitive is available.
- **Respect the design system** — do not override shadcn component styles arbitrarily. Use the existing CSS variables (`--color-*`, `--radius`, etc.) defined in `app/app.css`. Avoid hardcoded colors, font sizes, or spacing that bypasses the token system.
- **Composition over customization** — extend shadcn components via `className` prop when small adjustments are needed. Only create wrapper components for complex, reused compositions.
- **Icons** — use Lucide React (already included via shadcn). Do not add other icon libraries.

### Available primitives (key ones)

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart` (recharts wrapper), `checkbox`, `combobox`, `command`, `dialog`, `drawer`, `dropdown-menu`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner` (toasts), `switch`, `table`, `tabs`, `textarea`, `toggle`, `tooltip`

Custom project primitives: `button-group`, `empty`, `field`, `input-group`, `item`, `kbd`, `spinner`
