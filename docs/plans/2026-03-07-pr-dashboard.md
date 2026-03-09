# PR Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir um dashboard de Pull Requests para gestores de engenharia com autenticação GitHub OAuth, agrupamento inteligente de PRs em 8 categorias, e gerenciamento de repositórios via LocalStorage.

**Architecture:** React Router v7 com SSR habilitado. Autenticação custom via GitHub OAuth 2.0 — a troca de código por token acontece server-side em um loader do React Router, o token fica em cookie httpOnly, e as chamadas à API do GitHub acontecem client-side via TanStack Query para otimizar Rate Limit por IP. PRs são agrupados por uma função pura determinística com ordem de precedência estrita.

**Tech Stack:** React Router v7 (SSR), TanStack Query v5, shadcn/ui (radix-lyra style), Tailwind CSS v4, TypeScript, Vitest (testes unitários nas funções puras), cookie (parsing server-side).

---

## Contexto do Projeto

- **Framework real:** React Router v7 (SSR) — o design doc menciona TanStack Start, mas o projeto usa React Router v7 que é equivalente.
- **Diretório de app:** `app/` com alias `~/` para importações.
- **shadcn/ui:** Estilo `radix-lyra`, cor base `mist`, já configurado.
- **Componentes existentes:** `app/components/ui/` com button, card, badge, checkbox, etc.
- **Alias de paths:** `~/components` → `app/components`, `~/lib` → `app/lib`, `~/hooks` → `app/hooks`.
- **Build command:** `npm run dev` para dev, `npm run build` para build, `npm run typecheck` para verificar tipos.

---

## Grupos de PRs (Ordem de Precedência Estrita)

1. **Destravar** — Revisados pelo usuário + atividade nova (commits/comentários) do autor.
2. **Inbox** — `review-requested` direto para o usuário + nenhuma ação tomada.
3. **Quick Wins** — PRs pequenos (< 5 arq / < 50 linhas) + sem solicitação ou interação do usuário.
4. **Finalização** — 1+ aprovação de terceiros + CI verde + sem aprovação do usuário.
5. **Stale** — Inatividade absoluta (zero commits/comentários) por > 5 dias úteis.
6. **Exploração** — Catch-all para qualquer PR aberto que não se encaixou acima.
7. **Aprovados** — Status `APPROVED` pelo usuário + nenhuma mudança posterior.
8. **Mergeados** — Lista dos últimos 5 PRs com status `MERGED`.

Um PR **só pode estar em um grupo** — o primeiro grupo que casar vence.

---

## Task 1: Instalar Dependências

**Files:**
- Modify: `package.json`

**Step 1: Instalar TanStack Query, cookie e vitest**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools cookie
npm install -D vitest @vitest/ui happy-dom
```

**Step 2: Verificar instalação**

```bash
npm list @tanstack/react-query cookie vitest 2>/dev/null | grep -E "(react-query|cookie|vitest)"
```

Expected output: Três linhas com as versões instaladas.

**Step 3: Adicionar script de test ao package.json**

Abrir `package.json` e adicionar em `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Criar vitest.config.ts**

Criar `vitest.config.ts` na raiz:
```typescript
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "happy-dom",
  },
})
```

**Step 5: Verificar typecheck funciona**

```bash
npm run typecheck 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add TanStack Query, cookie parser, and vitest"
```

---

## Task 2: Session Cookie Utilities (Server-Side)

**Files:**
- Create: `app/lib/session.server.ts`

**Step 1: Escrever teste para session utilities**

Criar `app/lib/session.server.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { createSessionCookie, parseSessionFromCookieHeader } from "~/lib/session.server"

describe("session.server", () => {
  it("creates a signed cookie string", () => {
    const cookie = createSessionCookie({ token: "gh_abc123" }, "test-secret")
    expect(cookie).toContain("session=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Lax")
  })

  it("parses token from cookie header", () => {
    const cookie = createSessionCookie({ token: "gh_abc123" }, "test-secret")
    const cookieName = cookie.split("=")[0]
    const cookieValue = cookie.split("=")[1].split(";")[0]
    const result = parseSessionFromCookieHeader(
      `${cookieName}=${cookieValue}`,
      "test-secret"
    )
    expect(result?.token).toBe("gh_abc123")
  })

  it("returns null for invalid cookie", () => {
    const result = parseSessionFromCookieHeader("session=tampered", "test-secret")
    expect(result).toBeNull()
  })
})
```

**Step 2: Rodar teste para verificar falha**

```bash
npm test -- app/lib/session.server.test.ts 2>&1 | tail -10
```

Expected: FAIL com "Cannot find module"

**Step 3: Implementar session utilities**

Criar `app/lib/session.server.ts`:
```typescript
import { parse, serialize } from "cookie"

const COOKIE_NAME = "session"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

type Session = {
  token: string
}

function sign(value: string, secret: string): string {
  // Simple HMAC-like signature using Web Crypto — browser-safe via btoa
  const payload = btoa(JSON.stringify({ v: value, t: Date.now() }))
  const sig = btoa(`${payload}.${secret}`)
  return `${payload}.${sig}`
}

function verify(signed: string, secret: string): string | null {
  const parts = signed.split(".")
  if (parts.length < 2) return null
  const payload = parts.slice(0, -1).join(".")
  const expectedSig = btoa(`${payload}.${secret}`)
  if (parts[parts.length - 1] !== expectedSig) return null
  try {
    const { v } = JSON.parse(atob(payload))
    return v
  } catch {
    return null
  }
}

export function createSessionCookie(session: Session, secret: string): string {
  const signed = sign(JSON.stringify(session), secret)
  return serialize(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export function parseSessionFromCookieHeader(
  cookieHeader: string,
  secret: string
): Session | null {
  const cookies = parse(cookieHeader)
  const signed = cookies[COOKIE_NAME]
  if (!signed) return null
  const value = verify(signed, secret)
  if (!value) return null
  try {
    return JSON.parse(value) as Session
  } catch {
    return null
  }
}

export function clearSessionCookie(): string {
  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
```

**Step 4: Rodar testes para verificar aprovação**

```bash
npm test -- app/lib/session.server.test.ts 2>&1 | tail -10
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add app/lib/session.server.ts app/lib/session.server.test.ts
git commit -m "feat: add server-side session cookie utilities"
```

---

## Task 3: Configuração de Variáveis de Ambiente

**Files:**
- Create: `.env.example`
- Create: `.env` (gitignored)
- Create: `app/lib/env.server.ts`

**Step 1: Criar .env.example**

Criar `.env.example`:
```bash
# GitHub OAuth App
# Criar em: https://github.com/settings/developers
# Callback URL: http://localhost:5173/auth/callback
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Gerar com: openssl rand -hex 32
SESSION_SECRET=your_random_32_char_secret_here

# URL base da aplicação
APP_URL=http://localhost:5173
```

**Step 2: Criar .env local (valores de dev)**

Criar `.env` (substituir pelos valores reais ao configurar OAuth app):
```bash
GITHUB_CLIENT_ID=placeholder_configure_oauth_app
GITHUB_CLIENT_SECRET=placeholder_configure_oauth_app
SESSION_SECRET=dev_secret_change_in_production_32chars
APP_URL=http://localhost:5173
```

**Step 3: Verificar que .env está no .gitignore**

```bash
grep -c "^\.env$" .gitignore || echo ".env NOT in gitignore — ADD IT"
```

Se não estiver, adicionar `.env` ao `.gitignore`.

**Step 4: Criar env.server.ts com validação**

Criar `app/lib/env.server.ts`:
```typescript
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  GITHUB_CLIENT_ID: requireEnv("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: requireEnv("GITHUB_CLIENT_SECRET"),
  SESSION_SECRET: requireEnv("SESSION_SECRET"),
  APP_URL: requireEnv("APP_URL"),
} as const
```

**Step 5: Commit**

```bash
git add .env.example app/lib/env.server.ts .gitignore
git commit -m "chore: add env config with validation"
```

---

## Task 4: Tipos do GitHub

**Files:**
- Create: `app/lib/github.types.ts`

**Step 1: Criar tipos TypeScript para a API do GitHub**

Criar `app/lib/github.types.ts`:
```typescript
export type GitHubUser = {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export type PullRequestAuthor = {
  login: string
  avatar_url: string
}

export type ReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "PENDING"

export type Review = {
  id: number
  user: PullRequestAuthor
  state: ReviewState
  submitted_at: string
}

export type CheckConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | null

export type CheckRun = {
  id: number
  name: string
  status: "queued" | "in_progress" | "completed"
  conclusion: CheckConclusion
}

export type PullRequest = {
  id: number
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  draft: boolean
  merged_at: string | null
  created_at: string
  updated_at: string
  user: PullRequestAuthor
  requested_reviewers: PullRequestAuthor[]
  additions: number
  deletions: number
  changed_files: number
  // Campos enriquecidos que buscamos separadamente
  reviews?: Review[]
  check_runs?: CheckRun[]
  comments_count?: number
  commits_count?: number
  repo_full_name?: string
}

export type EnrichedPR = Required<PullRequest> & {
  repo_full_name: string
}
```

**Step 2: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -E "(error|warning)" | head -10
```

Expected: Sem erros relacionados ao arquivo novo.

**Step 3: Commit**

```bash
git add app/lib/github.types.ts
git commit -m "feat: add GitHub API TypeScript types"
```

---

## Task 5: Lógica de Agrupamento de PRs

Esta é a função mais crítica do sistema — pura e altamente testável.

**Files:**
- Create: `app/lib/pr-groups.ts`
- Create: `app/lib/pr-groups.test.ts`

**Step 1: Escrever testes para a função de agrupamento**

Criar `app/lib/pr-groups.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { groupPullRequests, BUSINESS_DAYS_THRESHOLD } from "~/lib/pr-groups"
import type { EnrichedPR } from "~/lib/github.types"

// Helper para criar PRs com defaults razoáveis
function makePR(overrides: Partial<EnrichedPR>): EnrichedPR {
  const now = new Date().toISOString()
  return {
    id: Math.random(),
    number: 1,
    title: "Test PR",
    html_url: "https://github.com/org/repo/pull/1",
    state: "open",
    draft: false,
    merged_at: null,
    created_at: now,
    updated_at: now,
    user: { login: "author", avatar_url: "" },
    requested_reviewers: [],
    additions: 10,
    deletions: 5,
    changed_files: 2,
    reviews: [],
    check_runs: [],
    comments_count: 0,
    commits_count: 1,
    repo_full_name: "org/repo",
    ...overrides,
  }
}

const ME = "reviewer-me"

describe("groupPullRequests", () => {
  it("coloca PR merged no grupo Mergeados", () => {
    const pr = makePR({ state: "closed", merged_at: new Date().toISOString() })
    const result = groupPullRequests([pr], ME)
    expect(result.merged.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR com minha aprovação e sem mudança nova no grupo Aprovados", () => {
    const approvedAt = new Date(Date.now() - 1000).toISOString()
    const pr = makePR({
      updated_at: new Date(Date.now() - 2000).toISOString(),
      reviews: [{ id: 1, user: { login: ME, avatar_url: "" }, state: "APPROVED", submitted_at: approvedAt }],
    })
    const result = groupPullRequests([pr], ME)
    expect(result.approved.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR stale no grupo Alerta", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const pr = makePR({ updated_at: oldDate, comments_count: 0, commits_count: 1 })
    const result = groupPullRequests([pr], ME)
    expect(result.stale.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR com review-requested no Inbox se não revisei ainda", () => {
    const pr = makePR({
      requested_reviewers: [{ login: ME, avatar_url: "" }],
      reviews: [],
    })
    const result = groupPullRequests([pr], ME)
    expect(result.inbox.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR pequeno sem minha interação no Quick Wins", () => {
    const pr = makePR({
      changed_files: 3,
      additions: 20,
      deletions: 10,
      reviews: [],
      requested_reviewers: [],
    })
    const result = groupPullRequests([pr], ME)
    expect(result.quickWins.map((p) => p.id)).toContain(pr.id)
  })

  it("PR deve aparecer em apenas um grupo", () => {
    const pr = makePR({
      changed_files: 2,
      additions: 10,
      deletions: 5,
    })
    const result = groupPullRequests([pr], ME)
    const allGroupIds = [
      ...result.unlock,
      ...result.inbox,
      ...result.quickWins,
      ...result.closing,
      ...result.stale,
      ...result.explore,
      ...result.approved,
      ...result.merged,
    ].map((p) => p.id)
    const uniqueIds = new Set(allGroupIds)
    expect(allGroupIds.length).toBe(uniqueIds.size)
  })
})
```

**Step 2: Rodar testes para verificar falha**

```bash
npm test -- app/lib/pr-groups.test.ts 2>&1 | tail -15
```

Expected: FAIL com "Cannot find module"

**Step 3: Implementar a lógica de agrupamento**

Criar `app/lib/pr-groups.ts`:
```typescript
import type { EnrichedPR } from "~/lib/github.types"

export const BUSINESS_DAYS_THRESHOLD = 5

type PRGroups = {
  unlock: EnrichedPR[]    // 1. Destravar
  inbox: EnrichedPR[]     // 2. Inbox
  quickWins: EnrichedPR[] // 3. Quick Wins
  closing: EnrichedPR[]   // 4. Finalização
  stale: EnrichedPR[]     // 5. Alerta (Stale)
  explore: EnrichedPR[]   // 6. Exploração
  approved: EnrichedPR[]  // 7. Aprovados
  merged: EnrichedPR[]    // 8. Mergeados
}

function businessDaysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  let days = 0
  const current = new Date(date)
  while (current < now) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days++
    current.setDate(current.getDate() + 1)
  }
  return days
}

function isMerged(pr: EnrichedPR): boolean {
  return pr.merged_at !== null
}

function isApprovedByMe(pr: EnrichedPR, me: string): boolean {
  const myLatestReview = pr.reviews
    .filter((r) => r.user.login === me)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
  return myLatestReview?.state === "APPROVED"
}

function hasNewActivityAfterMyApproval(pr: EnrichedPR, me: string): boolean {
  const myLatestApproval = pr.reviews
    .filter((r) => r.user.login === me && r.state === "APPROVED")
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
  if (!myLatestApproval) return false
  return new Date(pr.updated_at) > new Date(myLatestApproval.submitted_at)
}

function isReviewRequestedForMe(pr: EnrichedPR, me: string): boolean {
  return pr.requested_reviewers.some((r) => r.login === me)
}

function hasIInteracted(pr: EnrichedPR, me: string): boolean {
  return pr.reviews.some((r) => r.user.login === me)
}

function isSmall(pr: EnrichedPR): boolean {
  return pr.changed_files < 5 && pr.additions + pr.deletions < 50
}

function hasCIGreen(pr: EnrichedPR): boolean {
  const completed = pr.check_runs.filter((c) => c.status === "completed")
  if (completed.length === 0) return false
  return completed.every((c) => c.conclusion === "success" || c.conclusion === "neutral" || c.conclusion === "skipped")
}

function hasThirdPartyApproval(pr: EnrichedPR, me: string): boolean {
  return pr.reviews.some((r) => r.user.login !== me && r.user.login !== pr.user.login && r.state === "APPROVED")
}

function isStale(pr: EnrichedPR): boolean {
  return businessDaysSince(pr.updated_at) > BUSINESS_DAYS_THRESHOLD
}

function isUnlock(pr: EnrichedPR, me: string): boolean {
  // Revisei + atividade nova do autor após minha revisão
  if (!hasIInteracted(pr, me)) return false
  const myLastReview = pr.reviews
    .filter((r) => r.user.login === me)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
  if (!myLastReview) return false
  return new Date(pr.updated_at) > new Date(myLastReview.submitted_at)
}

export function groupPullRequests(prs: EnrichedPR[], me: string): PRGroups {
  const groups: PRGroups = {
    unlock: [],
    inbox: [],
    quickWins: [],
    closing: [],
    stale: [],
    explore: [],
    approved: [],
    merged: [],
  }

  for (const pr of prs) {
    // 8. Mergeados (últimos 5 são filtrados no caller)
    if (isMerged(pr)) {
      groups.merged.push(pr)
      continue
    }

    // 7. Aprovados — aprovei e nenhuma mudança depois
    if (isApprovedByMe(pr, me) && !hasNewActivityAfterMyApproval(pr, me)) {
      groups.approved.push(pr)
      continue
    }

    // 1. Destravar — interagi + nova atividade após minha revisão
    if (isUnlock(pr, me)) {
      groups.unlock.push(pr)
      continue
    }

    // 2. Inbox — review-requested para mim + não interagi ainda
    if (isReviewRequestedForMe(pr, me) && !hasIInteracted(pr, me)) {
      groups.inbox.push(pr)
      continue
    }

    // 3. Quick Wins — PR pequeno + sem minha solicitação ou interação
    if (isSmall(pr) && !isReviewRequestedForMe(pr, me) && !hasIInteracted(pr, me)) {
      groups.quickWins.push(pr)
      continue
    }

    // 4. Finalização — aprovação de terceiros + CI verde + sem minha aprovação
    if (hasThirdPartyApproval(pr, me) && hasCIGreen(pr) && !isApprovedByMe(pr, me)) {
      groups.closing.push(pr)
      continue
    }

    // 5. Stale — inatividade > 5 dias úteis
    if (isStale(pr)) {
      groups.stale.push(pr)
      continue
    }

    // 6. Exploração — catch-all
    groups.explore.push(pr)
  }

  // Manter apenas últimos 5 mergeados
  groups.merged = groups.merged
    .sort((a, b) => new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime())
    .slice(0, 5)

  return groups
}
```

**Step 4: Rodar testes**

```bash
npm test -- app/lib/pr-groups.test.ts 2>&1 | tail -15
```

Expected: PASS (todos os testes)

**Step 5: Commit**

```bash
git add app/lib/pr-groups.ts app/lib/pr-groups.test.ts
git commit -m "feat: implement PR grouping logic with 8 priority groups"
```

---

## Task 6: GitHub API Client (Client-Side)

**Files:**
- Create: `app/lib/github.ts`

**Step 1: Escrever teste para GitHub client**

Criar `app/lib/github.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchPRsForRepo, fetchCurrentUser } from "~/lib/github"

describe("github client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("fetchCurrentUser retorna o usuário autenticado", async () => {
    const mockUser = { id: 1, login: "testuser", name: "Test User", avatar_url: "" }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    } as Response)

    const user = await fetchCurrentUser("gh_token")
    expect(user.login).toBe("testuser")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer gh_token" }) })
    )
  })

  it("lança erro quando resposta não é ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response)

    await expect(fetchCurrentUser("bad_token")).rejects.toThrow("GitHub API error: 401")
  })
})
```

**Step 2: Rodar teste para verificar falha**

```bash
npm test -- app/lib/github.test.ts 2>&1 | tail -10
```

**Step 3: Implementar GitHub client**

Criar `app/lib/github.ts`:
```typescript
import type { GitHubUser, PullRequest, Review, CheckRun, EnrichedPR } from "~/lib/github.types"

const BASE_URL = "https://api.github.com"

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export async function fetchCurrentUser(token: string): Promise<GitHubUser> {
  return githubFetch<GitHubUser>("/user", token)
}

export async function fetchPRsForRepo(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<PullRequest[]> {
  return githubFetch<PullRequest[]>(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`,
    token
  )
}

export async function fetchPRReviews(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Review[]> {
  return githubFetch<Review[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    token
  )
}

export async function fetchCheckRuns(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<CheckRun[]> {
  // Busca checks do commit HEAD do PR via /commits/{ref}/check-runs
  const pr = await githubFetch<{ head: { sha: string } }>(
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
    token
  )
  const result = await githubFetch<{ check_runs: CheckRun[] }>(
    `/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`,
    token
  )
  return result.check_runs
}

export async function enrichPR(
  token: string,
  owner: string,
  repo: string,
  pr: PullRequest
): Promise<EnrichedPR> {
  const [reviews, checkRuns] = await Promise.all([
    fetchPRReviews(token, owner, repo, pr.number),
    fetchCheckRuns(token, owner, repo, pr.number).catch(() => [] as CheckRun[]),
  ])

  return {
    ...pr,
    reviews,
    check_runs: checkRuns,
    comments_count: pr.comments_count ?? 0,
    commits_count: pr.commits_count ?? 0,
    repo_full_name: `${owner}/${repo}`,
  } as EnrichedPR
}

export async function fetchAllPRsForRepos(
  token: string,
  repos: string[] // formato "owner/repo"
): Promise<EnrichedPR[]> {
  const allEnriched = await Promise.all(
    repos.map(async (repoFullName) => {
      const [owner, repo] = repoFullName.split("/")
      const [openPRs, closedPRs] = await Promise.all([
        fetchPRsForRepo(token, owner, repo, "open"),
        fetchPRsForRepo(token, owner, repo, "closed").then((prs) =>
          prs.filter((p) => p.merged_at !== null).slice(0, 10)
        ),
      ])
      const prs = [...openPRs, ...closedPRs]
      return Promise.all(prs.map((pr) => enrichPR(token, owner, repo, pr)))
    })
  )
  return allEnriched.flat()
}
```

**Step 4: Rodar testes**

```bash
npm test -- app/lib/github.test.ts 2>&1 | tail -10
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/lib/github.ts app/lib/github.test.ts app/lib/github.types.ts
git commit -m "feat: add GitHub API client with PR enrichment"
```

---

## Task 7: GitHub OAuth - Rotas de Autenticação

**Files:**
- Create: `app/routes/login.tsx`
- Create: `app/routes/auth.github.tsx`
- Create: `app/routes/auth.callback.tsx`
- Modify: `app/routes.ts`

**Step 1: Criar rota de login**

Criar `app/routes/login.tsx`:
```typescript
import { Link, redirect } from "react-router"
import type { Route } from "./+types/login"
import { parseSessionFromCookieHeader } from "~/lib/session.server"
import { env } from "~/lib/env.server"

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? ""
  const session = parseSessionFromCookieHeader(cookieHeader, env.SESSION_SECRET)
  if (session?.token) {
    throw redirect("/")
  }
  return null
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">PR Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Faça login com sua conta do GitHub para continuar.
          </p>
        </div>
        <Link
          to="/auth/github"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-6 text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Entrar com GitHub
        </Link>
      </div>
    </div>
  )
}
```

**Step 2: Criar rota de redirect para GitHub**

Criar `app/routes/auth.github.tsx`:
```typescript
import { redirect } from "react-router"
import type { Route } from "./+types/auth.github"
import { env } from "~/lib/env.server"

export async function loader(_: Route.LoaderArgs) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/auth/callback`,
    scope: "read:user read:org repo",
    state: crypto.randomUUID(),
  })
  throw redirect(`https://github.com/login/oauth/authorize?${params}`)
}

export default function AuthGitHub() {
  return null
}
```

**Step 3: Criar rota de callback**

Criar `app/routes/auth.callback.tsx`:
```typescript
import { redirect } from "react-router"
import type { Route } from "./+types/auth.callback"
import { env } from "~/lib/env.server"
import { createSessionCookie } from "~/lib/session.server"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error || !code) {
    throw redirect("/login?error=oauth_denied")
  }

  // Troca code por access_token — acontece SERVER-SIDE para proteger CLIENT_SECRET
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string
    error?: string
  }

  if (!tokenData.access_token) {
    throw redirect("/login?error=token_exchange_failed")
  }

  const sessionCookie = createSessionCookie(
    { token: tokenData.access_token },
    env.SESSION_SECRET
  )

  throw redirect("/", {
    headers: { "Set-Cookie": sessionCookie },
  })
}

export default function AuthCallback() {
  return null
}
```

**Step 4: Atualizar routes.ts**

Modificar `app/routes.ts`:
```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/github", "routes/auth.github.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
] satisfies RouteConfig
```

**Step 5: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -v "^$" | head -20
```

**Step 6: Commit**

```bash
git add app/routes/login.tsx app/routes/auth.github.tsx app/routes/auth.callback.tsx app/routes.ts
git commit -m "feat: implement GitHub OAuth login flow with server-side token exchange"
```

---

## Task 8: Hook de Gerenciamento de Repositórios

**Files:**
- Create: `app/hooks/use-repos.ts`

**Step 1: Escrever teste para o hook**

Criar `app/hooks/use-repos.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { parseRepos, addRepo, removeRepo } from "~/hooks/use-repos"

describe("repo management (pure functions)", () => {
  it("parseRepos retorna array vazio para string vazia", () => {
    expect(parseRepos("")).toEqual([])
  })

  it("parseRepos parseia JSON válido", () => {
    expect(parseRepos(JSON.stringify(["org/repo1", "org/repo2"]))).toEqual([
      "org/repo1",
      "org/repo2",
    ])
  })

  it("parseRepos retorna array vazio para JSON inválido", () => {
    expect(parseRepos("not-json")).toEqual([])
  })

  it("addRepo adiciona repositório sem duplicatas", () => {
    const repos = ["org/repo1"]
    expect(addRepo(repos, "org/repo2")).toEqual(["org/repo1", "org/repo2"])
    expect(addRepo(repos, "org/repo1")).toEqual(["org/repo1"]) // sem duplicata
  })

  it("removeRepo remove repositório existente", () => {
    const repos = ["org/repo1", "org/repo2"]
    expect(removeRepo(repos, "org/repo1")).toEqual(["org/repo2"])
  })
})
```

**Step 2: Rodar teste para verificar falha**

```bash
npm test -- app/hooks/use-repos.test.ts 2>&1 | tail -10
```

**Step 3: Implementar hook**

Criar `app/hooks/use-repos.ts`:
```typescript
import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "pr-dashboard:repos"

export function parseRepos(raw: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRepo(repos: string[], repo: string): string[] {
  if (repos.includes(repo)) return repos
  return [...repos, repo]
}

export function removeRepo(repos: string[], repo: string): string[] {
  return repos.filter((r) => r !== repo)
}

export function useRepos() {
  const [repos, setRepos] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ""
    setRepos(parseRepos(stored))
  }, [])

  const save = useCallback((updated: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setRepos(updated)
  }, [])

  const add = useCallback(
    (repo: string) => save(addRepo(repos, repo)),
    [repos, save]
  )

  const remove = useCallback(
    (repo: string) => save(removeRepo(repos, repo)),
    [repos, save]
  )

  return { repos, add, remove }
}
```

**Step 4: Rodar testes**

```bash
npm test -- app/hooks/use-repos.test.ts 2>&1 | tail -10
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/hooks/use-repos.ts app/hooks/use-repos.test.ts
git commit -m "feat: add repo management hook with localStorage persistence"
```

---

## Task 9: TanStack Query Setup e Hook de Dashboard

**Files:**
- Create: `app/lib/query-client.ts`
- Create: `app/hooks/use-dashboard.ts`
- Modify: `app/root.tsx`

**Step 1: Criar QueryClient singleton**

Criar `app/lib/query-client.ts`:
```typescript
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      refetchOnWindowFocus: false,
    },
  },
})
```

**Step 2: Atualizar root.tsx para incluir QueryClientProvider**

Modificar `app/root.tsx` — adicionar os imports e wrapper:
```typescript
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import type { Route } from "./+types/root"
import "./app.css"
import { queryClient } from "~/lib/query-client"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
```

**Step 3: Criar hook de dashboard**

Criar `app/hooks/use-dashboard.ts`:
```typescript
import { useQuery } from "@tanstack/react-query"
import { fetchAllPRsForRepos } from "~/lib/github"
import { groupPullRequests } from "~/lib/pr-groups"

export function useDashboard(token: string | null, repos: string[], login: string) {
  return useQuery({
    queryKey: ["dashboard", repos, login],
    queryFn: () => fetchAllPRsForRepos(token!, repos),
    enabled: !!token && repos.length > 0,
    select: (prs) => groupPullRequests(prs, login),
  })
}
```

**Step 4: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -v "^$" | head -20
```

**Step 5: Commit**

```bash
git add app/lib/query-client.ts app/root.tsx app/hooks/use-dashboard.ts
git commit -m "feat: setup TanStack Query with dashboard data hook"
```

---

## Task 10: Componente PR Card

**Files:**
- Create: `app/components/pr-card.tsx`

**Step 1: Verificar quais componentes shadcn estão disponíveis**

```bash
ls app/components/ui/
```

**Step 2: Implementar PR Card**

Criar `app/components/pr-card.tsx`:
```typescript
import { ExternalLink, GitBranch, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react"
import type { EnrichedPR } from "~/lib/github.types"
import { Badge } from "~/components/ui/badge"

type Props = {
  pr: EnrichedPR
}

function CIStatus({ pr }: { pr: EnrichedPR }) {
  const completed = pr.check_runs.filter((c) => c.status === "completed")
  if (completed.length === 0) return null

  const allGreen = completed.every(
    (c) => c.conclusion === "success" || c.conclusion === "neutral" || c.conclusion === "skipped"
  )

  return allGreen ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  ) : (
    <XCircle className="h-3.5 w-3.5 text-red-500" />
  )
}

function ApprovalCount({ pr }: { pr: EnrichedPR }) {
  const approvals = pr.reviews.filter((r) => r.state === "APPROVED").length
  if (approvals === 0) return null
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <CheckCircle2 className="h-3 w-3 text-green-500" />
      {approvals}
    </Badge>
  )
}

export function PRCard({ pr }: Props) {
  const repoName = pr.repo_full_name.split("/")[1] ?? pr.repo_full_name
  const diffSize = pr.additions + pr.deletions

  return (
    <div className="bg-card hover:bg-accent/50 flex items-start gap-3 rounded-md border p-3 transition-colors">
      <img
        src={pr.user.avatar_url}
        alt={pr.user.login}
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary line-clamp-2 text-sm font-medium leading-snug"
          >
            {pr.title}
          </a>
          <ExternalLink className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <GitBranch className="h-3 w-3" />
            {repoName}#{pr.number}
          </span>
          <span className="text-muted-foreground text-xs">
            por {pr.user.login}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {new Date(pr.updated_at).toLocaleDateString("pt-BR")}
          </span>
          {pr.comments_count > 0 && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              {pr.comments_count}
            </span>
          )}
          <span className="text-xs text-green-600">+{pr.additions}</span>
          <span className="text-xs text-red-500">-{pr.deletions}</span>
          {diffSize < 50 && (
            <Badge variant="outline" className="text-xs">
              small
            </Badge>
          )}
          <CIStatus pr={pr} />
          <ApprovalCount pr={pr} />
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -E "error" | head -10
```

**Step 4: Commit**

```bash
git add app/components/pr-card.tsx
git commit -m "feat: add PR card component"
```

---

## Task 11: Componente PR Group

**Files:**
- Create: `app/components/pr-group.tsx`

**Step 1: Implementar PR Group com skeleton**

Criar `app/components/pr-group.tsx`:
```typescript
import type { EnrichedPR } from "~/lib/github.types"
import { PRCard } from "~/components/pr-card"
import { Badge } from "~/components/ui/badge"
import { Separator } from "~/components/ui/separator"

type Props = {
  title: string
  icon: string
  prs: EnrichedPR[]
  isLoading?: boolean
  defaultCollapsed?: boolean
}

function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <div className="bg-muted h-7 w-7 shrink-0 animate-pulse rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
      </div>
    </div>
  )
}

export function PRGroup({ title, icon, prs, isLoading, defaultCollapsed }: Props) {
  if (!isLoading && prs.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {!isLoading && (
          <Badge variant="secondary" className="text-xs">
            {prs.length}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
          : prs.map((pr) => <PRCard key={`${pr.repo_full_name}-${pr.number}`} pr={pr} />)
        }
      </div>
      <Separator />
    </section>
  )
}
```

**Step 2: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -E "error" | head -10
```

**Step 3: Commit**

```bash
git add app/components/pr-group.tsx
git commit -m "feat: add PR group section component with skeleton loading"
```

---

## Task 12: Sidebar de Gerenciamento de Repositórios

**Files:**
- Create: `app/components/sidebar.tsx`

**Step 1: Implementar Sidebar**

Criar `app/components/sidebar.tsx`:
```typescript
import { useState } from "react"
import { Plus, Trash2, Settings } from "lucide-react"
import { useRepos } from "~/hooks/use-repos"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"

type Props = {
  onLogout: () => void
  userLogin: string
  userAvatar: string
}

export function Sidebar({ onLogout, userLogin, userAvatar }: Props) {
  const { repos, add, remove } = useRepos()
  const [newRepo, setNewRepo] = useState("")
  const [error, setError] = useState("")

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const repo = newRepo.trim()
    if (!repo.match(/^[\w.-]+\/[\w.-]+$/)) {
      setError("Formato inválido. Use owner/repo")
      return
    }
    add(repo)
    setNewRepo("")
    setError("")
  }

  return (
    <aside className="bg-sidebar border-sidebar-border flex h-full w-64 shrink-0 flex-col border-r">
      {/* User */}
      <div className="flex items-center gap-3 p-4">
        <img src={userAvatar} alt={userLogin} className="h-8 w-8 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{userLogin}</p>
          <button
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Sair
          </button>
        </div>
        <Settings className="text-muted-foreground h-4 w-4" />
      </div>

      <Separator />

      {/* Repos */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Repositórios
        </p>

        <form onSubmit={handleAdd} className="flex gap-1.5">
          <Input
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            placeholder="owner/repo"
            className="h-8 text-xs"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        {error && <p className="text-destructive text-xs">{error}</p>}

        <ul className="flex flex-col gap-1">
          {repos.map((repo) => (
            <li
              key={repo}
              className="hover:bg-accent flex items-center justify-between rounded-md px-2 py-1.5"
            >
              <span className="truncate text-xs">{repo}</span>
              <button
                onClick={() => remove(repo)}
                className="text-muted-foreground hover:text-destructive ml-2 shrink-0 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {repos.length === 0 && (
            <li className="text-muted-foreground py-4 text-center text-xs">
              Adicione repositórios para monitorar
            </li>
          )}
        </ul>
      </div>
    </aside>
  )
}
```

**Step 2: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -E "error" | head -10
```

**Step 3: Commit**

```bash
git add app/components/sidebar.tsx
git commit -m "feat: add sidebar with repo management"
```

---

## Task 13: Dashboard Principal e Proteção de Rota

**Files:**
- Modify: `app/routes/home.tsx`
- Create: `app/lib/auth.server.ts`

**Step 1: Criar helper de auth server-side**

Criar `app/lib/auth.server.ts`:
```typescript
import { redirect } from "react-router"
import { parseSessionFromCookieHeader } from "~/lib/session.server"
import { clearSessionCookie } from "~/lib/session.server"
import { env } from "~/lib/env.server"

export async function requireAuth(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("Cookie") ?? ""
  const session = parseSessionFromCookieHeader(cookieHeader, env.SESSION_SECRET)
  if (!session?.token) {
    throw redirect("/login")
  }
  return session.token
}

export function logoutHeaders(): HeadersInit {
  return {
    "Set-Cookie": clearSessionCookie(),
    Location: "/login",
  }
}
```

**Step 2: Reescrever a rota home como dashboard protegido**

Modificar `app/routes/home.tsx`:
```typescript
import { redirect } from "react-router"
import type { Route } from "./+types/home"
import { requireAuth } from "~/lib/auth.server"
import { fetchCurrentUser } from "~/lib/github"
import { clearSessionCookie } from "~/lib/session.server"
import { env } from "~/lib/env.server"
import { useDashboard } from "~/hooks/use-dashboard"
import { useRepos } from "~/hooks/use-repos"
import { Sidebar } from "~/components/sidebar"
import { PRGroup } from "~/components/pr-group"

export async function loader({ request }: Route.LoaderArgs) {
  const token = await requireAuth(request)
  const user = await fetchCurrentUser(token)
  return { token, user }
}

export async function action({ request }: Route.ActionArgs) {
  // Logout
  const { clearSessionCookie } = await import("~/lib/session.server")
  const { env } = await import("~/lib/env.server")
  throw redirect("/login", {
    headers: { "Set-Cookie": clearSessionCookie() },
  })
}

const GROUPS = [
  { key: "unlock" as const, title: "Destravar", icon: "🚀" },
  { key: "inbox" as const, title: "Inbox", icon: "📥" },
  { key: "quickWins" as const, title: "Quick Wins", icon: "⚡" },
  { key: "closing" as const, title: "Finalização", icon: "🏁" },
  { key: "stale" as const, title: "Alerta (Stale)", icon: "⏰" },
  { key: "explore" as const, title: "Exploração", icon: "🔍" },
  { key: "approved" as const, title: "Aprovados", icon: "✅" },
  { key: "merged" as const, title: "Mergeados", icon: "🏆" },
]

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { token, user } = loaderData
  const { repos } = useRepos()
  const { data: groups, isLoading, isError } = useDashboard(token, repos, user.login)

  async function handleLogout() {
    await fetch("/?index", { method: "POST" })
    window.location.href = "/login"
  }

  const totalOpen = groups
    ? GROUPS.slice(0, 6).reduce((sum, g) => sum + groups[g.key].length, 0)
    : 0

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onLogout={handleLogout}
        userLogin={user.login}
        userAvatar={user.avatar_url}
      />

      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-background/95 sticky top-0 z-10 border-b px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Pull Requests</h1>
            {!isLoading && (
              <span className="text-muted-foreground text-sm">
                {repos.length === 0
                  ? "Adicione repositórios na sidebar"
                  : `${totalOpen} PRs em aberto`}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 p-6">
          {repos.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-20 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-sm">Nenhum repositório adicionado ainda.</p>
              <p className="text-xs">Use a sidebar para adicionar repositórios.</p>
            </div>
          ) : isError ? (
            <div className="text-muted-foreground py-20 text-center text-sm">
              Erro ao carregar PRs. Verifique seu token e tente novamente.
            </div>
          ) : (
            GROUPS.map(({ key, title, icon }) => (
              <PRGroup
                key={key}
                title={title}
                icon={icon}
                prs={groups?.[key] ?? []}
                isLoading={isLoading}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
```

**Step 3: Verificar typecheck**

```bash
npm run typecheck 2>&1 | grep -E "error" | head -20
```

Corrigir quaisquer erros de tipo antes de continuar.

**Step 4: Testar o dev server**

```bash
npm run dev 2>&1 &
sleep 3
curl -s http://localhost:5173/ -o /dev/null -w "%{http_code}"
```

Expected: `302` (redirect para /login por não estar autenticado)

**Step 5: Commit**

```bash
git add app/routes/home.tsx app/lib/auth.server.ts
git commit -m "feat: implement protected dashboard with 8 PR groups"
```

---

## Task 14: Rodar Todos os Testes e Verificação Final

**Step 1: Rodar suite completa de testes**

```bash
npm test 2>&1 | tail -20
```

Expected: Todos os testes passando.

**Step 2: Rodar typecheck completo**

```bash
npm run typecheck 2>&1
```

Expected: Sem erros.

**Step 3: Build de produção**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completo sem erros.

**Step 4: Commit final**

```bash
git add -A
git status
```

Verificar que não há arquivos não rastreados antes de commitar.

```bash
git commit -m "chore: verify all tests pass and build succeeds"
```

---

## Configuração do GitHub OAuth App

Após a implementação, para usar o app:

1. Acessar GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. **Application name:** PR Dashboard
3. **Homepage URL:** `http://localhost:5173`
4. **Authorization callback URL:** `http://localhost:5173/auth/callback`
5. Copiar **Client ID** e **Client Secret** para o `.env`
6. Rodar `npm run dev`

---

## Resumo de Todos os Arquivos

| Arquivo | Status |
|---------|--------|
| `vitest.config.ts` | Criar |
| `app/lib/session.server.ts` | Criar |
| `app/lib/session.server.test.ts` | Criar |
| `app/lib/env.server.ts` | Criar |
| `app/lib/github.types.ts` | Criar |
| `app/lib/github.ts` | Criar |
| `app/lib/github.test.ts` | Criar |
| `app/lib/pr-groups.ts` | Criar |
| `app/lib/pr-groups.test.ts` | Criar |
| `app/lib/query-client.ts` | Criar |
| `app/lib/auth.server.ts` | Criar |
| `app/hooks/use-repos.ts` | Criar |
| `app/hooks/use-repos.test.ts` | Criar |
| `app/hooks/use-dashboard.ts` | Criar |
| `app/components/pr-card.tsx` | Criar |
| `app/components/pr-group.tsx` | Criar |
| `app/components/sidebar.tsx` | Criar |
| `app/routes/login.tsx` | Criar |
| `app/routes/auth.github.tsx` | Criar |
| `app/routes/auth.callback.tsx` | Criar |
| `app/routes/home.tsx` | Modificar |
| `app/routes.ts` | Modificar |
| `app/root.tsx` | Modificar |
| `package.json` | Modificar |
| `.env.example` | Criar |
