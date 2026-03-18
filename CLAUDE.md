# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on port 3000
npm run build        # Production build
npm run test         # Run tests (Vitest)
npm run lint         # ESLint
npm run format       # Prettier (all .ts/.tsx/.js/.jsx)
npm run typecheck    # TypeScript type check (no emit)
```

## Architecture

**Stack:** React 19 + TanStack Router (file-based) + TanStack Start (SSR) + React Query + Tailwind CSS 4 + shadcn/ui

**Routing:** File-based via `src/routes/`. `routeTree.gen.ts` is auto-generated — never edit it manually.

**Path alias:** Use `@/` for all imports (maps to `src/`).

### Key directories

- `src/routes/` — Pages: `login.tsx`, `home.tsx` (reviewed PRs), `my-prs.tsx` (own PRs)
- `src/components/ui/` — shadcn/ui components (57 pre-built, do not modify manually — use shadcn CLI)
- `src/components/` — App components: `pr-card.tsx`, `pr-group.tsx`, `app-sidebar.tsx`, `repo-combobox.tsx`
- `src/hooks/` — Custom hooks: `use-dashboard.ts`, `use-my-prs.ts`, `use-repos.ts`, `use-current-user.ts`
- `src/lib/` — Core logic: `github.ts` (API client), `pr-groups.ts` (categorization algorithm), `github.types.ts`, `utils.ts`

### Data flow

```
GitHub API → github.ts → React Query hooks → pr-groups.ts → Components
```

Auth token is stored in an HTTP-only secure cookie. Tracked repositories are stored in localStorage (`pr-dashboard:repos`).

### PR categorization (core business logic)

`pr-groups.ts` → `groupPullRequests()` classifies PRs into 7 categories (home) or 3 categories (my-prs):

**Home categories:**
1. **Destravar** — Reviewed + new activity since my review
2. **Inbox** — Review directly requested + no action taken yet
3. **Quick Wins** — Small PRs (≤200 lines) not yet requested/interacted
4. **Alerta (Stale)** — No activity for >5 business days
5. **Exploração** — All other open PRs
6. **Aprovados** — Approved by me, no new activity
7. **Mergeados** — Last 5 merged PRs only

**My PRs categories:**
1. **Precisa de Ajuste** — Changes requested on my PR
2. **Aguardando Revisão** — No reviews yet
3. **Pronto para Merge** — Approved + CI green

### TanStack conventions (mandatory)

**Data fetching — always use React Query, never `useState + useEffect`:**

```ts
// WRONG
const [data, setData] = useState(null)
useEffect(() => { fetch(...).then(setData) }, [])

// CORRECT
const { data } = useQuery({ queryKey: ["key"], queryFn: fetchFn })
// or with Suspense (preferred for route-level data)
const { data } = useSuspenseQuery({ queryKey: ["key"], queryFn: fetchFn })
```

**Key options to always consider:**
- `staleTime` — set explicitly; default 0 causes unnecessary refetches (project default: 1 min in `query-client.ts`)
- `enabled` — use to conditionally run queries (e.g., `enabled: !!token`)
- `select` — transform/filter data inside the query instead of in components
- `placeholderData: keepPreviousData` — for pagination/filtering to avoid loading flicker
- `queryKey` must be serializable arrays; include all variables the query depends on

**Cache invalidation — never reset local state manually:**

```ts
// WRONG: setData([]) after mutation
// CORRECT:
queryClient.invalidateQueries({ queryKey: ["prs"] })
// or optimistic update via onMutate/onError/onSettled in useMutation
```

**Routing — always use TanStack Router APIs:**

```ts
// Navigation
const navigate = useNavigate()
navigate({ to: "/home" })

// URL params
const { repoId } = useParams({ from: "/repos/$repoId" })

// Search params (type-safe)
const search = useSearch({ from: "/home" })

// NEVER use window.location or React Router imports
```

**Route loaders vs hooks:** Prefer `loader` in route files for data that must be available before render. Use `useQuery` inside components for secondary/optional data.

**Context7:** When in doubt about a specific TanStack API, use `mcp__plugin_context7_context7__resolve-library-id` + `query-docs` to fetch current docs before writing code.

### Styling conventions

- shadcn/ui style: `radix-nova`, base color: `taupe`, CSS variables enabled
- Prettier: no semicolons, double quotes, 2-space indent, trailing commas (es5), `prettier-plugin-tailwindcss`
- Use `cn()` from `@/lib/utils` to merge Tailwind classes
