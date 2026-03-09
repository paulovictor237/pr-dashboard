# Shadcn Dashboard Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refatorar todos os componentes do dashboard para usar shadcn/ui, removendo HTML puro e componentes custom que reimplementam padrões existentes.

**Architecture:** SidebarProvider wrapping the root route, AppSidebar usando shadcn Sidebar, RepoCombobox via Command+Popover, PRCard via Card+Avatar, PRGroup via Collapsible+Skeleton. Nenhuma lógica de dados é alterada.

**Tech Stack:** React 19, shadcn/ui, Radix UI, cmdk, Tailwind CSS v4, React Router 7.

**Design doc:** `docs/plans/2026-03-08-shadcn-refactor-design.md`

---

### Task 1: Instalar novos componentes shadcn

**Files:**
- Modify: `app/components/ui/` (shadcn cria os arquivos automaticamente)
- Modify: `package.json`, `package-lock.json`

**Step 1: Instalar componentes via shadcn CLI**

```bash
npx shadcn@latest add sidebar command skeleton scroll-area collapsible --overwrite
```

Expected: arquivos criados em `app/components/ui/sidebar.tsx`, `command.tsx`, `skeleton.tsx`, `scroll-area.tsx`, `collapsible.tsx`.

**Step 2: Verificar que não há erros de TypeScript**

```bash
npm run typecheck
```

Expected: sem erros novos.

**Step 3: Commit**

```bash
git add app/components/ui/ package.json package-lock.json
git commit -m "feat(ui): install sidebar, command, skeleton, scroll-area, collapsible"
```

---

### Task 2: Reescrever PRCard com Card + Avatar

**Files:**
- Modify: `app/components/pr-card.tsx`

**Step 1: Reescrever o componente**

Substituir o conteúdo completo de `app/components/pr-card.tsx`:

```tsx
import { ExternalLink, GitBranch, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react"
import type { EnrichedPR } from "~/lib/github.types"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent } from "~/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"

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
    <Card className="rounded-md transition-colors hover:bg-accent/50">
      <CardContent className="flex items-start gap-3 p-3">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
          <AvatarFallback>{pr.user.login[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
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
            <span className="text-muted-foreground text-xs">por {pr.user.login}</span>
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
      </CardContent>
    </Card>
  )
}
```

**Step 2: Verificar TypeScript**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 3: Commit**

```bash
git add app/components/pr-card.tsx
git commit -m "feat(pr-card): use Card and Avatar shadcn components"
```

---

### Task 3: Reescrever PRGroup com Collapsible + Skeleton

**Files:**
- Modify: `app/components/pr-group.tsx`

**Step 1: Reescrever o componente**

Substituir o conteúdo completo de `app/components/pr-group.tsx`:

```tsx
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { EnrichedPR } from "~/lib/github.types"
import { PRCard } from "~/components/pr-card"
import { Badge } from "~/components/ui/badge"
import { Skeleton } from "~/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

type Props = {
  title: string
  icon: string
  prs: EnrichedPR[]
  isLoading?: boolean
  description?: string
}

export function PRGroup({ title, icon, prs, isLoading, description }: Props) {
  const [open, setOpen] = useState(isLoading || prs.length > 0)

  const trigger = (
    <CollapsibleTrigger
      onClick={() => setOpen((v) => !v)}
      className="flex w-fit items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-base">{icon}</span>
      <h2 className="text-sm font-semibold">{title}</h2>
      {!isLoading && (
        <Badge variant="secondary" className="text-xs">
          {prs.length}
        </Badge>
      )}
      <ChevronDown
        className={cn(
          "text-muted-foreground h-3.5 w-3.5 transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-fit">{trigger}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            {description}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <CollapsibleContent className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))
        ) : prs.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">Nenhum PR nessa categoria</p>
        ) : (
          prs.map((pr) => <PRCard key={`${pr.repo_full_name}-${pr.number}`} pr={pr} />)
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
```

**Step 2: Verificar TypeScript**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 3: Commit**

```bash
git add app/components/pr-group.tsx
git commit -m "feat(pr-group): use Collapsible and Skeleton shadcn components"
```

---

### Task 4: Reescrever RepoCombobox com Command + Popover

**Files:**
- Modify: `app/components/repo-combobox.tsx`

**Step 1: Reescrever o componente**

Substituir o conteúdo completo de `app/components/repo-combobox.tsx`:

```tsx
import { useState } from "react"
import { Check, ChevronsUpDown, RefreshCw, Search } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useUserRepos } from "~/hooks/use-user-repos"
import { useSearchRepos } from "~/hooks/use-search-repos"
import type { RepoSuggestion } from "~/lib/github"
import { Button } from "~/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command"
import { cn } from "~/lib/utils"

type Props = {
  token: string
  addedRepos: string[]
  onAdd: (repo: string) => void
}

export function RepoCombobox({ token, addedRepos, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const queryClient = useQueryClient()

  const { data: userRepos = [], isFetching: fetchingUser } = useUserRepos(token)
  const { data: searchResults = [], isFetching: loadingSearch } = useSearchRepos(token, query)

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["user-repos", token] })
    queryClient.invalidateQueries({ queryKey: ["search-repos", token] })
  }

  const filteredUserRepos =
    query.length === 0
      ? userRepos
      : userRepos.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase()))

  const userRepoNames = new Set(userRepos.map((r) => r.full_name))
  const extraSearchResults = searchResults.filter((r) => !userRepoNames.has(r.full_name))

  function handleSelect(repo: RepoSuggestion) {
    if (addedRepos.includes(repo.full_name)) return
    onAdd(repo.full_name)
    setQuery("")
    setOpen(false)
  }

  const hasResults = filteredUserRepos.length > 0 || extraSearchResults.length > 0

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between text-xs font-normal"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              Buscar repositório...
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar repositório..."
              value={query}
              onValueChange={setQuery}
              className="text-xs"
            />
            <CommandList>
              {!hasResults && !loadingSearch && (
                <CommandEmpty className="text-xs">
                  {query.length >= 2 ? "Nenhum repositório encontrado" : "Digite para buscar"}
                </CommandEmpty>
              )}

              {filteredUserRepos.length > 0 && (
                <CommandGroup heading="Seus repositórios">
                  {filteredUserRepos.map((repo) => (
                    <CommandItem
                      key={repo.full_name}
                      value={repo.full_name}
                      disabled={addedRepos.includes(repo.full_name)}
                      onSelect={() => handleSelect(repo)}
                      className="text-xs"
                    >
                      <span className="truncate">{repo.full_name}</span>
                      {addedRepos.includes(repo.full_name) && (
                        <Check className={cn("ml-auto h-3 w-3")} />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {filteredUserRepos.length > 0 && extraSearchResults.length > 0 && (
                <CommandSeparator />
              )}

              {extraSearchResults.length > 0 && (
                <CommandGroup heading="Busca no GitHub">
                  {extraSearchResults.map((repo) => (
                    <CommandItem
                      key={repo.full_name}
                      value={repo.full_name}
                      onSelect={() => handleSelect(repo)}
                      className="text-xs"
                    >
                      <span className="truncate">{repo.full_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {loadingSearch && (
                <div className="flex items-center justify-center py-3">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleRefresh}
        title="Recarregar repositórios"
        className="h-8 w-8 shrink-0"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", fetchingUser && "animate-spin")} />
      </Button>
    </div>
  )
}
```

**Step 2: Verificar TypeScript**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 3: Commit**

```bash
git add app/components/repo-combobox.tsx
git commit -m "feat(repo-combobox): rewrite with Command and Popover shadcn"
```

---

### Task 5: Criar AppSidebar com shadcn Sidebar

**Files:**
- Create: `app/components/app-sidebar.tsx`
- Delete: `app/components/sidebar.tsx`

**Step 1: Criar `app/components/app-sidebar.tsx`**

```tsx
import { Trash2, LogOut, ChevronsUpDown } from "lucide-react"
import { useRepos } from "~/hooks/use-repos"
import { RepoCombobox } from "~/components/repo-combobox"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "~/components/ui/sidebar"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

type Props = {
  onLogout: () => void
  userLogin: string
  userAvatar: string
  token: string
}

export function AppSidebar({ onLogout, userLogin, userAvatar, token }: Props) {
  const { repos, add, remove } = useRepos()

  return (
    <Sidebar>
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md p-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar size="sm" className="shrink-0">
                <AvatarImage src={userAvatar} alt={userLogin} />
                <AvatarFallback>{userLogin[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userLogin}</p>
                <p className="text-xs text-muted-foreground">GitHub</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-48">
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Repositórios</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <RepoCombobox token={token} addedRepos={repos} onAdd={add} />

            <ScrollArea className="max-h-[calc(100vh-200px)]">
              <SidebarMenu>
                {repos.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Adicione repositórios para monitorar
                  </p>
                ) : (
                  repos.map((repo) => (
                    <SidebarMenuItem key={repo}>
                      <SidebarMenuButton className="text-xs" title={repo}>
                        <span className="truncate">{repo}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        onClick={() => remove(repo)}
                        title="Remover"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

**Step 2: Deletar sidebar.tsx antigo**

```bash
rm app/components/sidebar.tsx
```

**Step 3: Verificar TypeScript**

```bash
npm run typecheck
```

Expected: sem erros (home.tsx ainda importa `Sidebar` — será corrigido na próxima task).

**Step 4: Commit**

```bash
git add app/components/app-sidebar.tsx
git rm app/components/sidebar.tsx
git commit -m "feat(sidebar): replace custom sidebar with shadcn AppSidebar"
```

---

### Task 6: Atualizar home.tsx com SidebarProvider + SidebarInset

**Files:**
- Modify: `app/routes/home.tsx`

**Step 1: Reescrever `app/routes/home.tsx`**

Substituir o conteúdo completo:

```tsx
import { redirect } from "react-router"
import type { Route } from "./+types/home"
import { RefreshCw } from "lucide-react"
import { requireAuth } from "~/lib/auth.server"
import { fetchCurrentUser } from "~/lib/github"
import { clearTokenCookie } from "~/lib/session.server"
import { useDashboard } from "~/hooks/use-dashboard"
import { useRepos } from "~/hooks/use-repos"
import { AppSidebar } from "~/components/app-sidebar"
import { PRGroup } from "~/components/pr-group"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"

export async function loader({ request }: Route.LoaderArgs) {
  const token = await requireAuth(request)
  const user = await fetchCurrentUser(token)
  return { token, user }
}

export async function action({ request }: Route.ActionArgs) {
  throw redirect("/login", {
    headers: { "Set-Cookie": clearTokenCookie() },
  })
}

const GROUPS = [
  {
    key: "unlock" as const,
    title: "Destravar",
    icon: "🚀",
    description: "PRs que você já revisou e onde o autor fez novos commits ou comentários após sua revisão.",
  },
  {
    key: "inbox" as const,
    title: "Inbox",
    icon: "📥",
    description: "PRs com revisão solicitada diretamente para você e que ainda não foram respondidas.",
  },
  {
    key: "quickWins" as const,
    title: "Quick Wins",
    icon: "⚡",
    description: "PRs pequenos (≤200 linhas) sem interação sua — revisões rápidas de encaixar.",
  },
  {
    key: "closing" as const,
    title: "Finalização",
    icon: "🏁",
    description: "PRs com aprovação de terceiros e CI verde aguardando apenas seu merge ou aprovação final.",
  },
  {
    key: "stale" as const,
    title: "Alerta (Stale)",
    icon: "⏰",
    description: "PRs sem nenhuma atividade (commits ou comentários) nos últimos 5 dias úteis.",
  },
  {
    key: "explore" as const,
    title: "Exploração",
    icon: "🔍",
    description: "PRs abertos que não se encaixam em nenhuma outra categoria.",
  },
  {
    key: "approved" as const,
    title: "Aprovados",
    icon: "✅",
    description: "PRs que você aprovou e que não tiveram mudanças desde então.",
  },
  {
    key: "merged" as const,
    title: "Mergeados",
    icon: "🏆",
    description: "Os últimos 5 PRs que foram mergeados nos repositórios monitorados.",
  },
]

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { token, user } = loaderData
  const { repos, refresh: refreshRepos } = useRepos()
  const {
    data: groups,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDashboard(token, repos, user.login)

  function handleRefresh() {
    refreshRepos()
    refetch()
  }

  async function handleLogout() {
    await fetch("/?index", { method: "POST" })
    window.location.href = "/login"
  }

  const totalOpen = groups
    ? GROUPS.slice(0, 6).reduce((sum, g) => sum + groups[g.key].length, 0)
    : 0

  return (
    <SidebarProvider>
      <AppSidebar
        onLogout={handleLogout}
        userLogin={user.login}
        userAvatar={user.avatar_url}
        token={token}
      />

      <SidebarInset>
        {/* Header */}
        <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">Pull Requests</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isFetching}
                className="h-7 w-7"
                title="Atualizar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {!isLoading && (
              <span className="text-muted-foreground text-sm">
                {repos.length === 0
                  ? "Adicione repositórios na sidebar"
                  : `${totalOpen} PRs em aberto`}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-col gap-6 p-6">
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
            GROUPS.map(({ key, title, icon, description }) => (
              <PRGroup
                key={key}
                title={title}
                icon={icon}
                description={description}
                prs={groups?.[key] ?? []}
                isLoading={isLoading}
              />
            ))
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**Step 2: Verificar TypeScript**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 3: Commit**

```bash
git add app/routes/home.tsx
git commit -m "feat(home): use SidebarProvider and SidebarInset from shadcn"
```

---

### Task 7: Verificação final e cleanup

**Step 1: Rodar typecheck completo**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 2: Verificar que componentes custom foram removidos**

```bash
ls app/components/
```

Expected: NÃO deve aparecer `sidebar.tsx` (o antigo). Deve aparecer `app-sidebar.tsx`.

**Step 3: Rodar testes**

```bash
npm test
```

Expected: todos os testes passam (a lógica de dados não foi alterada).

**Step 4: Commit final se necessário**

```bash
git add -A
git commit -m "chore: final cleanup shadcn refactor"
```
