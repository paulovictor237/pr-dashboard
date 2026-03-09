# Cleanup React Router 7 Residues — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remover dead code e dependências legadas do React Router 7 e atualizar a documentação para refletir o uso correto do TanStack Start.

**Architecture:** O projeto usa TanStack Start + TanStack Router para SSR e roteamento. `session.server.ts` era o módulo de cookie do React Router 7 (serialização manual via pacote `cookie`), mas está completamente não utilizado — `auth.server.ts` já usa as utilities nativas do TanStack Start (`getCookie`/`setCookie`/`deleteCookie`).

**Tech Stack:** TanStack Start (`@tanstack/react-start`), TanStack Router (`@tanstack/react-router`), TypeScript, Vite, Vitest.

---

### Task 1: Deletar `session.server.ts` e seu test file

**Files:**
- Delete: `src/lib/session.server.ts`
- Delete: `src/lib/session.server.test.ts`

**Step 1: Confirmar que o arquivo não é usado em nenhum lugar além do próprio test**

```bash
grep -r "session.server" src/ --include="*.ts" --include="*.tsx"
```

Expected: apenas a linha em `src/lib/session.server.test.ts:6`.

**Step 2: Deletar os arquivos**

```bash
rm src/lib/session.server.ts
rm src/lib/session.server.test.ts
```

**Step 3: Rodar os testes para garantir que nada quebrou**

```bash
npm test
```

Expected: todos os testes passam (o único teste removido era o de `session.server`).

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused session.server (React Router 7 leftover)"
```

---

### Task 2: Remover dependências `cookie` e `@types/cookie`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (gerado automaticamente pelo npm)

**Step 1: Confirmar que `cookie` não é usado em nenhum outro arquivo**

```bash
grep -r "from ['\"]cookie['\"]" src/
```

Expected: nenhum resultado (o único uso era em `session.server.ts`, já removido).

**Step 2: Remover as dependências**

```bash
npm uninstall cookie @types/cookie
```

**Step 3: Verificar que o build/typecheck continua passando**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 4: Rodar os testes novamente**

```bash
npm test
```

Expected: todos os testes passam.

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove cookie dependency (no longer used)"
```

---

### Task 3: Atualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Localizar as referências desatualizadas**

No `CLAUDE.md`, as seções a atualizar são:
- Linha na seção **Architecture**: `**Stack:** React Router 7 (SSR), ...` → trocar por TanStack Start
- Linha `npm run typecheck    # react-router typegen + tsc` → ajustar comentário
- Seção **Key Files**: remover a linha `lib/session.server.ts — Cookie utilities (create/read/clear token)`

**Step 2: Aplicar as alterações**

Na seção Architecture, substituir:
```
**Stack:** React Router 7 (SSR), React 19, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS v4, next-themes, recharts, sonner, vaul, react-day-picker, react-resizable-panels.
```
por:
```
**Stack:** TanStack Start (SSR), TanStack Router, React 19, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS v4, next-themes, recharts, sonner, vaul, react-day-picker, react-resizable-panels.
```

No comentário do typecheck, substituir:
```
npm run typecheck    # react-router typegen + tsc
```
por:
```
npm run typecheck    # tsc --noEmit
```

Na seção Key Files, remover a linha:
```
- `lib/session.server.ts` — Cookie utilities (create/read/clear token)
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect TanStack Start architecture"
```
