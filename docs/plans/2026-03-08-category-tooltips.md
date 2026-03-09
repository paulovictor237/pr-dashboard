# Category Tooltips & Always-Visible Groups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar tooltip com descrição em cada categoria do dashboard e garantir que categorias vazias sempre apareçam com estado vazio.

**Architecture:** Instalar o componente `Tooltip` do shadcn/ui, adicionar prop `description` ao `PRGroup`, envolver o header em `Tooltip`, remover o early return que oculta grupos vazios e exibir texto muted no lugar.

**Tech Stack:** React, shadcn/ui (Tooltip via Radix UI), Tailwind CSS, TypeScript

---

### Task 1: Instalar o componente Tooltip do shadcn/ui

**Files:**
- Create: `app/components/ui/tooltip.tsx`

**Step 1: Instalar via CLI**

```bash
npx shadcn@latest add tooltip
```

Expected: arquivo `app/components/ui/tooltip.tsx` criado.

**Step 2: Verificar que o arquivo existe**

```bash
ls app/components/ui/tooltip.tsx
```

**Step 3: Commit**

```bash
git add app/components/ui/tooltip.tsx
git commit -m "feat(ui): add Tooltip shadcn component"
```

---

### Task 2: Adicionar `description` ao PRGroup e implementar Tooltip + estado vazio

**Files:**
- Modify: `app/components/pr-group.tsx`

**Step 1: Substituir o conteúdo do arquivo**

Substitua o arquivo `app/components/pr-group.tsx` pelo seguinte:

```tsx
import type { EnrichedPR } from "~/lib/github.types"
import { PRCard } from "~/components/pr-card"
import { Badge } from "~/components/ui/badge"
import { Separator } from "~/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"

type Props = {
  title: string
  icon: string
  prs: EnrichedPR[]
  isLoading?: boolean
  description?: string
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

export function PRGroup({ title, icon, prs, isLoading, description }: Props) {
  const header = (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <h2 className="text-sm font-semibold">{title}</h2>
      {!isLoading && (
        <Badge variant="secondary" className="text-xs">
          {prs.length}
        </Badge>
      )}
    </div>
  )

  return (
    <section className="flex flex-col gap-3">
      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-fit cursor-default">{header}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            {description}
          </TooltipContent>
        </Tooltip>
      ) : (
        header
      )}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
        ) : prs.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">Nenhum PR nessa categoria</p>
        ) : (
          prs.map((pr) => <PRCard key={`${pr.repo_full_name}-${pr.number}`} pr={pr} />)
        )}
      </div>
      <Separator />
    </section>
  )
}
```

**Step 2: Verificar tipos com LSP ou typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 3: Commit**

```bash
git add app/components/pr-group.tsx
git commit -m "feat(pr-group): add description tooltip and empty state"
```

---

### Task 3: Adicionar `description` ao array GROUPS em home.tsx

**Files:**
- Modify: `app/routes/home.tsx`

**Step 1: Substituir o array GROUPS**

Localize o array `GROUPS` em `app/routes/home.tsx` e substitua por:

```ts
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
```

**Step 2: Atualizar o JSX para passar `description` ao PRGroup**

Localize o trecho que mapeia GROUPS para PRGroup e atualize:

```tsx
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
```

**Step 3: Verificar tipos**

```bash
npm run typecheck
```

Expected: sem erros.

**Step 4: Commit**

```bash
git add app/routes/home.tsx
git commit -m "feat(home): pass descriptions to PRGroup categories"
```

---

### Task 4: Verificação manual no browser

**Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

**Step 2: Verificar comportamento**

- [ ] Hover no header de qualquer categoria exibe tooltip com a descrição
- [ ] Categorias vazias exibem _"Nenhum PR nessa categoria"_ em vez de sumirem
- [ ] Categorias com PRs continuam funcionando normalmente
- [ ] Skeleton de loading ainda aparece corretamente
