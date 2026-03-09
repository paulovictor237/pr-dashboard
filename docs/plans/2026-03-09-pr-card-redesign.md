# PR Card Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesenhar o `PRCard` para responder "O que está acontecendo com esse PR?" como informação primária, com hierarquia clara: título → status → metadados.

**Architecture:** Refatoração do componente `app/components/pr-card.tsx`. Os subcomponentes `CIStatus` e `ReviewStatus` passam de ícones isolados para badges com texto legível. O layout do `PRCard` passa de fluxo único para 3 linhas com hierarquia visual clara.

**Tech Stack:** React 19, TypeScript, shadcn/ui (Badge, Avatar, Tooltip, Card), Lucide React, date-fns

---

### Task 1: Refatorar `CIStatus` para badges com label de texto

**Files:**
- Modify: `app/components/pr-card.tsx` (componente `CIStatus`, linhas 26–64)

**Context:**
O componente atual retorna apenas ícones pequenos com tooltip. O novo deve retornar `Badge` com ícone + texto curto, sem depender de tooltip para ser compreensível.

**Novos estados:**
- `in_progress` → Badge neutro com `Loader2` animado + "CI rodando"
- todos verde/neutral/skipped → Badge verde com `CheckCircle2` + "CI passou"
- qualquer falha → Badge vermelho com `XCircle` + "CI falhou"
- sem check_runs → retorna `null`

**Step 1: Implementar o novo `CIStatus`**

Substituir o componente `CIStatus` por:

```tsx
function CIStatus({ pr }: { pr: EnrichedPR }) {
  const inProgress = pr.check_runs.some((c) => c.status === "in_progress")
  const completed = pr.check_runs.filter((c) => c.status === "completed")

  if (inProgress)
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        CI rodando
      </Badge>
    )

  if (completed.length === 0) return null

  const allGreen = completed.every(
    (c) =>
      c.conclusion === "success" ||
      c.conclusion === "neutral" ||
      c.conclusion === "skipped"
  )

  return allGreen ? (
    <Badge variant="secondary" className="gap-1 text-xs text-green-600">
      <CheckCircle2 className="h-3 w-3 text-green-500" />
      CI passou
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1 text-xs">
      <XCircle className="h-3 w-3" />
      CI falhou
    </Badge>
  )
}
```

**Step 2: Verificar no browser**

Rodar `npm run dev` e verificar que os badges de CI aparecem corretamente com texto visível.

**Step 3: Commit parcial**

```bash
git add app/components/pr-card.tsx
git commit -m "refactor(pr-card): CIStatus com badge legível sem tooltip"
```

---

### Task 2: Refatorar `ReviewStatus` para badges com label de texto

**Files:**
- Modify: `app/components/pr-card.tsx` (componente `ReviewStatus`, linhas 66–100)

**Context:**
O componente atual usa badges pequenos com ícone mas sem label de texto adequado para "mudanças pedidas". O novo deve ter labels claros.

**Step 1: Implementar o novo `ReviewStatus`**

Substituir o componente `ReviewStatus` por:

```tsx
function ReviewStatus({ pr }: { pr: EnrichedPR }) {
  const changesRequested = pr.reviews.some(
    (r) => r.state === "CHANGES_REQUESTED"
  )
  const approvals = pr.reviews.filter((r) => r.state === "APPROVED").length

  return (
    <>
      {changesRequested && (
        <Badge variant="destructive" className="gap-1 text-xs">
          <XCircle className="h-3 w-3" />
          mudanças pedidas
        </Badge>
      )}
      {approvals > 0 && (
        <Badge variant="secondary" className="gap-1 text-xs text-green-600">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          {approvals === 1 ? "1 aprovação" : `${approvals} aprovações`}
        </Badge>
      )}
    </>
  )
}
```

**Step 2: Commit parcial**

```bash
git add app/components/pr-card.tsx
git commit -m "refactor(pr-card): ReviewStatus com badge legível sem tooltip"
```

---

### Task 3: Refatorar layout do `PRCard` para hierarquia título → status → metadados

**Files:**
- Modify: `app/components/pr-card.tsx` (componente `PRCard`, linhas 102–230)

**Context:**
O layout atual mistura todos os elementos em um fluxo único sem hierarquia. O novo layout tem 3 linhas distintas:

```
[avatar]  título do PR...  ↗  [rascunho]
          [CI badge]  [review badges]
          repo#123 · há 2h · +45 −12 · 💬3
```

A linha de status (linha 2) é omitida completamente se não há CI nem reviews.

**Step 1: Remover imports não mais necessários**

O `GitBranch` e `Clock` continuam sendo usados nos metadados. Remover apenas imports que ficarem sem uso após a refatoração (verificar ao final).

**Step 2: Implementar o novo layout do `PRCard`**

Substituir o componente `PRCard` por:

```tsx
export function PRCard({ pr }: Props) {
  const repoName = pr.repo_full_name.split("/")[1] ?? pr.repo_full_name
  const updatedAt = formatDistanceToNow(new Date(pr.updated_at), {
    addSuffix: true,
    locale: ptBR,
  })

  const hasStatus =
    pr.check_runs.length > 0 ||
    pr.reviews.some(
      (r) => r.state === "APPROVED" || r.state === "CHANGES_REQUESTED"
    )

  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar size="sm" className="mt-0.5 shrink-0 cursor-default">
              <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
              <AvatarFallback>{pr.user.login[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>Autor: {pr.user.login}</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1">
          {/* Linha 1: título */}
          <div className="flex items-start gap-2">
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 flex min-w-0 items-start gap-1 text-sm leading-snug font-medium hover:text-primary"
            >
              {pr.title}
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
            {pr.draft && (
              <Badge
                variant="outline"
                className="shrink-0 text-xs text-muted-foreground"
              >
                rascunho
              </Badge>
            )}
          </div>

          {/* Linha 2: status — omitida se não há nada a mostrar */}
          {hasStatus && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <CIStatus pr={pr} />
              <ReviewStatus pr={pr} />
            </div>
          )}

          {/* Linha 3: metadados secundários */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-default items-center gap-1 text-xs text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  {repoName}#{pr.number}
                </span>
              </TooltipTrigger>
              <TooltipContent>Repositório e número do PR</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-default items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {updatedAt}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Última atualização:{" "}
                {new Date(pr.updated_at).toLocaleString("pt-BR")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  <span className="text-xs text-green-600">
                    +{pr.additions}
                  </span>
                  <span className="text-xs text-muted-foreground"> / </span>
                  <span className="text-xs text-red-500">-{pr.deletions}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {pr.additions} linhas adicionadas, {pr.deletions} removidas (
                {pr.changed_files} arquivo{pr.changed_files !== 1 ? "s" : ""})
              </TooltipContent>
            </Tooltip>
            {pr.comments_count > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex cursor-default items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {pr.comments_count}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {pr.comments_count === 1
                    ? "1 comentário"
                    : `${pr.comments_count} comentários`}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Limpar imports não utilizados**

Após a refatoração, verificar e remover imports que não são mais usados no arquivo. Os imports `MessageSquare`, `GitBranch`, `Clock`, `ExternalLink`, `CheckCircle2`, `XCircle`, `Loader2` continuam sendo usados. Verificar se algum ficou sem uso.

**Step 4: Verificar tipos**

```bash
npm run typecheck
```

Esperado: sem erros de tipo.

**Step 5: Commit final**

```bash
git add app/components/pr-card.tsx
git commit -m "refactor(pr-card): redesign com hierarquia título → status → metadados"
```
