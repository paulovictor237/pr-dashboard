# Repo Combobox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o input manual de `owner/repo` na sidebar por um combobox que lista repos do usuário e permite busca no GitHub.

**Architecture:** Dois hooks TanStack Query novos (`useUserRepos` e `useSearchRepos`) alimentam um componente `RepoCombobox` que exibe um dropdown com duas seções: repos do usuário (carregados ao abrir) e resultados de busca (ao digitar 2+ chars com debounce). O token já existe no `loaderData` do `home.tsx` e precisa ser passado para o `Sidebar`.

**Tech Stack:** React Router v7, TanStack Query v5, shadcn/ui (radix-lyra), Tailwind CSS v4, TypeScript.

---

### Task 1: Adicionar funções de API no github.ts

**Files:**
- Modify: `app/lib/github.ts`

**Step 1: Adicionar `fetchUserRepos` e `searchRepos` no final do arquivo**

```typescript
export type RepoSuggestion = {
  full_name: string
  description: string | null
  private: boolean
}

export async function fetchUserRepos(token: string): Promise<RepoSuggestion[]> {
  return githubFetch<RepoSuggestion[]>(
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    token
  )
}

export async function searchRepos(token: string, query: string): Promise<RepoSuggestion[]> {
  const result = await githubFetch<{ items: RepoSuggestion[] }>(
    `/search/repositories?q=${encodeURIComponent(query)}+in:name&per_page=10&sort=updated`,
    token
  )
  return result.items
}
```

**Step 2: Verificar tipos com typecheck**

Run: `npm run typecheck`
Expected: sem erros

**Step 3: Commit**

```bash
git add app/lib/github.ts
git commit -m "feat(github): add fetchUserRepos and searchRepos functions"
```

---

### Task 2: Hook useUserRepos

**Files:**
- Create: `app/hooks/use-user-repos.ts`

**Step 1: Criar o hook**

```typescript
import { useQuery } from "@tanstack/react-query"
import { fetchUserRepos } from "~/lib/github"

export function useUserRepos(token: string) {
  return useQuery({
    queryKey: ["user-repos", token],
    queryFn: () => fetchUserRepos(token),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!token,
  })
}
```

**Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros

**Step 3: Commit**

```bash
git add app/hooks/use-user-repos.ts
git commit -m "feat(hooks): add useUserRepos hook"
```

---

### Task 3: Hook useSearchRepos com debounce

**Files:**
- Create: `app/hooks/use-search-repos.ts`

**Step 1: Criar o hook com debounce interno usando useState + useEffect**

```typescript
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { searchRepos } from "~/lib/github"

export function useSearchRepos(token: string, query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ["search-repos", debouncedQuery],
    queryFn: () => searchRepos(token, debouncedQuery),
    enabled: !!token && debouncedQuery.length >= 2,
    staleTime: 60 * 1000, // 1 minuto
  })
}
```

**Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros

**Step 3: Commit**

```bash
git add app/hooks/use-search-repos.ts
git commit -m "feat(hooks): add useSearchRepos hook with debounce"
```

---

### Task 4: Componente RepoCombobox

**Files:**
- Create: `app/components/repo-combobox.tsx`

**Step 1: Criar o componente**

```typescript
import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { useUserRepos } from "~/hooks/use-user-repos"
import { useSearchRepos } from "~/hooks/use-search-repos"
import type { RepoSuggestion } from "~/lib/github"

type Props = {
  token: string
  addedRepos: string[]
  onAdd: (repo: string) => void
}

export function RepoCombobox({ token, addedRepos, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: userRepos = [], isLoading: loadingUser } = useUserRepos(token)
  const { data: searchResults = [], isFetching: loadingSearch } = useSearchRepos(token, query)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filtrar repos do usuário pelo query
  const filteredUserRepos = query.length === 0
    ? userRepos
    : userRepos.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase()))

  // Deduplicar search results em relação aos repos do usuário
  const userRepoNames = new Set(userRepos.map((r) => r.full_name))
  const extraSearchResults = searchResults.filter((r) => !userRepoNames.has(r.full_name))

  function handleSelect(repo: RepoSuggestion) {
    if (addedRepos.includes(repo.full_name)) return
    onAdd(repo.full_name)
    setQuery("")
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  const showSkeleton = loadingUser && filteredUserRepos.length === 0

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="text-muted-foreground absolute left-2 h-3.5 w-3.5" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar repositório..."
          className="border-input bg-background placeholder:text-muted-foreground h-8 w-full rounded-md border py-1 pr-2 pl-7 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        {loadingSearch && (
          <div className="absolute right-2 h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="bg-popover border-border absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-md">
          {showSkeleton ? (
            <div className="flex flex-col gap-1 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-muted h-6 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <>
              {/* Seus repos */}
              {filteredUserRepos.length > 0 && (
                <div>
                  <p className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider">
                    Seus repositórios
                  </p>
                  {filteredUserRepos.map((repo) => (
                    <RepoItem
                      key={repo.full_name}
                      repo={repo}
                      added={addedRepos.includes(repo.full_name)}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {/* Resultados de busca extras */}
              {extraSearchResults.length > 0 && (
                <div>
                  {filteredUserRepos.length > 0 && (
                    <div className="border-border my-1 border-t" />
                  )}
                  <p className="text-muted-foreground px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wider">
                    Busca no GitHub
                  </p>
                  {extraSearchResults.map((repo) => (
                    <RepoItem
                      key={repo.full_name}
                      repo={repo}
                      added={addedRepos.includes(repo.full_name)}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {/* Vazio */}
              {filteredUserRepos.length === 0 && extraSearchResults.length === 0 && (
                <p className="text-muted-foreground p-4 text-center text-xs">
                  {query.length >= 2 ? "Nenhum repositório encontrado" : "Digite para buscar"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

type RepoItemProps = {
  repo: RepoSuggestion
  added: boolean
  onSelect: (repo: RepoSuggestion) => void
}

function RepoItem({ repo, added, onSelect }: RepoItemProps) {
  return (
    <button
      type="button"
      disabled={added}
      onClick={() => onSelect(repo)}
      className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="truncate">{repo.full_name}</span>
      {added && <Check className="text-muted-foreground h-3 w-3 shrink-0" />}
    </button>
  )
}
```

**Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros

**Step 3: Commit**

```bash
git add app/components/repo-combobox.tsx
git commit -m "feat(components): add RepoCombobox with user repos and search"
```

---

### Task 5: Integrar RepoCombobox no Sidebar

**Files:**
- Modify: `app/components/sidebar.tsx`

**Step 1: Atualizar o componente Sidebar**

Substituir todo o conteúdo do `sidebar.tsx` por:

```typescript
import { Trash2, Settings } from "lucide-react"
import { useRepos } from "~/hooks/use-repos"
import { RepoCombobox } from "~/components/repo-combobox"
import { Separator } from "~/components/ui/separator"

type Props = {
  onLogout: () => void
  userLogin: string
  userAvatar: string
  token: string
}

export function Sidebar({ onLogout, userLogin, userAvatar, token }: Props) {
  const { repos, add, remove } = useRepos()

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

        <RepoCombobox token={token} addedRepos={repos} onAdd={add} />

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

**Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros (vai falhar porque home.tsx não passa token ainda)

**Step 3: Commit**

```bash
git add app/components/sidebar.tsx
git commit -m "feat(sidebar): replace input with RepoCombobox"
```

---

### Task 6: Passar token para Sidebar no home.tsx

**Files:**
- Modify: `app/routes/home.tsx`

**Step 1: Adicionar `token` na prop do Sidebar**

Localizar a linha com `<Sidebar` e adicionar `token={token}`:

```typescript
<Sidebar
  onLogout={handleLogout}
  userLogin={user.login}
  userAvatar={user.avatar_url}
  token={token}
/>
```

**Step 2: Verificar tipos — deve passar agora**

Run: `npm run typecheck`
Expected: sem erros

**Step 3: Commit**

```bash
git add app/routes/home.tsx
git commit -m "feat(home): pass token to Sidebar for repo combobox"
```

---

### Task 7: Smoke test manual

**Step 1: Subir o dev server**

Run: `npm run dev`

**Step 2: Verificar comportamento**

- [ ] Fazer login com PAT
- [ ] Clicar no campo de busca na sidebar → dropdown abre com skeleton, depois lista repos do usuário
- [ ] Digitar nome de repo → filtra repos do usuário em tempo real
- [ ] Digitar 2+ chars que não estão nos repos do usuário → seção "Busca no GitHub" aparece após ~300ms
- [ ] Clicar em um repo → é adicionado na lista abaixo, aparece com checkmark no dropdown
- [ ] Clicar fora → dropdown fecha
- [ ] ESC → dropdown fecha
