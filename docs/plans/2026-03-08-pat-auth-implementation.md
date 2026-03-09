# PAT Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o fluxo OAuth (GitHub OAuth App) por autenticação via Personal Access Token (PAT), eliminando todas as variáveis de ambiente de auth.

**Architecture:** O usuário cola seu PAT no formulário de login. Um server action valida o token chamando `GET /user` na API do GitHub. Se válido, salva em cookie plain (não-httpOnly, 30 dias) e redireciona para o dashboard. Loaders protegem rotas lendo o cookie server-side.

**Tech Stack:** React Router v7 (TanStack Start), `cookie` npm package, GitHub REST API.

---

### Task 1: Simplificar session.server.ts

Remove a lógica de assinatura HMAC e `SESSION_SECRET`. Mantém apenas helpers de cookie plain.

**Files:**
- Modify: `app/lib/session.server.ts`
- Modify: `app/lib/session.server.test.ts`

**Step 1: Reescrever os testes para a nova API**

Abra `app/lib/session.server.test.ts` e substitua o conteúdo por:

```typescript
import { describe, it, expect } from "vitest"
import { createTokenCookie, getTokenFromCookieHeader, clearTokenCookie } from "~/lib/session.server"

describe("session.server", () => {
  it("creates a cookie string with the token", () => {
    const cookie = createTokenCookie("gh_abc123")
    expect(cookie).toContain("gh_token=gh_abc123")
    expect(cookie).toContain("Max-Age=2592000")
    expect(cookie).toContain("SameSite=Lax")
  })

  it("parses token from cookie header", () => {
    const token = getTokenFromCookieHeader("gh_token=gh_abc123; other=val")
    expect(token).toBe("gh_abc123")
  })

  it("returns null when cookie is absent", () => {
    const token = getTokenFromCookieHeader("other=val")
    expect(token).toBeNull()
  })

  it("clear cookie sets Max-Age=0", () => {
    const cookie = clearTokenCookie()
    expect(cookie).toContain("gh_token=")
    expect(cookie).toContain("Max-Age=0")
  })
})
```

**Step 2: Rodar os testes para confirmar falha**

```bash
npx vitest run app/lib/session.server.test.ts
```

Esperado: FAIL (funções ainda não existem com esses nomes).

**Step 3: Reescrever session.server.ts**

```typescript
import { parse, serialize } from "cookie"

const COOKIE_NAME = "gh_token"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export function createTokenCookie(token: string): string {
  return serialize(COOKIE_NAME, token, {
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export function getTokenFromCookieHeader(cookieHeader: string): string | null {
  const cookies = parse(cookieHeader)
  return cookies[COOKIE_NAME] ?? null
}

export function clearTokenCookie(): string {
  return serialize(COOKIE_NAME, "", {
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
```

**Step 4: Rodar os testes para confirmar aprovação**

```bash
npx vitest run app/lib/session.server.test.ts
```

Esperado: PASS (3 testes passando).

**Step 5: Commit**

```bash
git add app/lib/session.server.ts app/lib/session.server.test.ts
git commit -m "refactor(auth): replace signed session cookie with plain PAT cookie"
```

---

### Task 2: Atualizar auth.server.ts

Remove dependência de `session.server` com secret e de `env.server`.

**Files:**
- Modify: `app/lib/auth.server.ts`

**Step 1: Reescrever auth.server.ts**

```typescript
import { redirect } from "react-router"
import { getTokenFromCookieHeader, clearTokenCookie } from "~/lib/session.server"

export async function requireAuth(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("Cookie") ?? ""
  const token = getTokenFromCookieHeader(cookieHeader)
  if (!token) {
    throw redirect("/login")
  }
  return token
}

export function logoutHeaders(): HeadersInit {
  return {
    "Set-Cookie": clearTokenCookie(),
    Location: "/login",
  }
}
```

**Step 2: Verificar que o TypeScript compila**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `auth.server.ts`.

**Step 3: Commit**

```bash
git add app/lib/auth.server.ts
git commit -m "refactor(auth): update requireAuth to use plain PAT cookie"
```

---

### Task 3: Reescrever login.tsx como formulário PAT

Remove o botão OAuth. Adiciona campo de texto para PAT com validação via GitHub API.

**Files:**
- Modify: `app/routes/login.tsx`

**Step 1: Reescrever login.tsx**

```typescript
import { redirect, Form, useActionData, useNavigation } from "react-router"
import type { Route } from "./+types/login"
import { getTokenFromCookieHeader, createTokenCookie } from "~/lib/session.server"

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? ""
  const token = getTokenFromCookieHeader(cookieHeader)
  if (token) {
    throw redirect("/")
  }
  return null
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const token = (formData.get("token") as string)?.trim()

  if (!token) {
    return { error: "Informe um token." }
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!response.ok) {
    return { error: "Token inválido ou sem permissão. Verifique os escopos." }
  }

  throw redirect("/", {
    headers: { "Set-Cookie": createTokenCookie(token) },
  })
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col gap-6 px-4">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">PR Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Cole seu GitHub Personal Access Token para continuar.
          </p>
        </div>

        <Form method="post" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="text-sm font-medium">
              Personal Access Token
            </label>
            <input
              id="token"
              name="token"
              type="password"
              placeholder="ghp_..."
              autoComplete="off"
              required
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
            {actionData?.error && (
              <p className="text-destructive text-sm">{actionData.error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex h-10 items-center justify-center rounded-md px-6 text-sm font-medium transition-colors"
          >
            {isSubmitting ? "Validando..." : "Entrar"}
          </button>
        </Form>

        <p className="text-muted-foreground text-center text-xs">
          Precisa de um token?{" "}
          <a
            href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=PR+Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Gerar no GitHub
          </a>{" "}
          (escopos: <code className="font-mono">repo</code>,{" "}
          <code className="font-mono">read:user</code>)
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Verificar que o TypeScript compila**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

**Step 3: Commit**

```bash
git add app/routes/login.tsx
git commit -m "feat(auth): replace OAuth button with PAT form"
```

---

### Task 4: Atualizar home.tsx

Troca o import de `clearSessionCookie` para `clearTokenCookie`.

**Files:**
- Modify: `app/routes/home.tsx`

**Step 1: Substituir o import**

Na linha 5 de `app/routes/home.tsx`, trocar:
```typescript
import { clearSessionCookie } from "~/lib/session.server"
```
Por:
```typescript
import { clearTokenCookie } from "~/lib/session.server"
```

Na linha 19, trocar:
```typescript
headers: { "Set-Cookie": clearSessionCookie() },
```
Por:
```typescript
headers: { "Set-Cookie": clearTokenCookie() },
```

**Step 2: Verificar que o TypeScript compila**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

**Step 3: Commit**

```bash
git add app/routes/home.tsx
git commit -m "refactor(home): update logout to use clearTokenCookie"
```

---

### Task 5: Remover rotas OAuth

Delete os arquivos de rota OAuth e atualiza o registro de rotas.

**Files:**
- Delete: `app/routes/auth.github.tsx`
- Delete: `app/routes/auth.callback.tsx`
- Modify: `app/routes.ts`

**Step 1: Deletar arquivos**

```bash
rm app/routes/auth.github.tsx app/routes/auth.callback.tsx
```

**Step 2: Atualizar routes.ts**

```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
] satisfies RouteConfig
```

**Step 3: Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

**Step 4: Commit**

```bash
git add app/routes.ts
git commit -m "refactor(auth): remove OAuth routes (auth.github, auth.callback)"
```

---

### Task 6: Limpar variáveis de ambiente

Remove `env.server.ts` (sem mais variáveis necessárias para auth) e atualiza `.env.example`.

**Files:**
- Delete: `app/lib/env.server.ts`
- Modify: `.env.example`

**Step 1: Verificar que env.server.ts não tem mais consumers**

```bash
grep -r "env.server" app/ --include="*.ts" --include="*.tsx"
```

Esperado: nenhum resultado (todos os consumers foram removidos nas tasks anteriores).

**Step 2: Deletar env.server.ts**

```bash
rm app/lib/env.server.ts
```

**Step 3: Atualizar .env.example**

Substituir o conteúdo por:
```
# Nenhuma variável de ambiente necessária para autenticação.
# A auth é feita via Personal Access Token do GitHub (inserido no login).
```

**Step 4: Verificar compilação final completa**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

**Step 5: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos os testes passando.

**Step 6: Commit**

```bash
git add app/lib/env.server.ts .env.example
git commit -m "chore(auth): remove env.server.ts and clear .env.example"
```

---

### Task 7: Verificação final

Sobe o servidor de dev e valida o fluxo completo.

**Step 1: Iniciar o servidor**

```bash
npm run dev
```

**Step 2: Testar fluxo de login**

1. Abrir `http://localhost:5173`
2. Confirmar redirecionamento para `/login`
3. Colar um PAT válido (com escopos `repo` e `read:user`)
4. Confirmar redirecionamento para `/` com dashboard carregando
5. Abrir DevTools → Application → Cookies: confirmar `gh_token` presente, `Max-Age=2592000`

**Step 3: Testar token inválido**

1. Ir para `/login`
2. Colar um token inválido (ex: `ghp_invalid`)
3. Confirmar mensagem de erro inline: "Token inválido ou sem permissão."

**Step 4: Testar logout**

1. No dashboard, clicar em logout
2. Confirmar redirecionamento para `/login`
3. Confirmar cookie `gh_token` removido

**Step 5: Commit final se houver ajustes**

```bash
git add -p
git commit -m "fix(auth): <descrição do ajuste>"
```
