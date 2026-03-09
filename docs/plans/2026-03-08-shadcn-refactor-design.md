# Design: Refactor Dashboard com shadcn/ui

**Data:** 2026-03-08
**Status:** Aprovado

## Objetivo

Refatorar o dashboard para usar exclusivamente componentes do design system shadcn/ui, eliminando HTML puro e componentes custom que reimplementam padrões já existentes no shadcn.

## Escopo

### Componentes a remover (custom → shadcn)
- `app/components/sidebar.tsx` → substituído por `app/components/app-sidebar.tsx` usando shadcn Sidebar
- `app/components/repo-combobox.tsx` → reescrito com `Command` + `Popover`
- `SkeletonCard` inline em `pr-group.tsx` → substituído por `Skeleton` shadcn

### Novos componentes shadcn a instalar
- `sidebar` — layout principal com suporte a colapso
- `command` — combobox de repositórios (depende de `cmdk`)
- `skeleton` — estados de loading
- `scroll-area` — áreas roláveis (sidebar repo list, main content)
- `collapsible` — grupos de PR colapsáveis

### Componentes já instalados que passam a ser usados corretamente
- `card`, `avatar`, `button`, `badge`, `tooltip`, `separator`, `dropdown-menu`

---

## Layout Geral (`home.tsx`)

Wrapper `SidebarProvider` no nível raiz gerencia estado de colapso da sidebar.

```
SidebarProvider
├── AppSidebar
└── SidebarInset
    ├── header (sticky): SidebarTrigger + título + Button refresh + contagem
    └── main: grupos de PR
```

O `SidebarInset` gerencia `margin-left` automaticamente ao colapsar/expandir.

---

## Sidebar (`app/components/app-sidebar.tsx`)

```
Sidebar
├── SidebarHeader
│   └── Avatar + username + Button logout (via DropdownMenu)
├── SidebarContent
│   └── SidebarGroup (label="Repositórios")
│       ├── RepoCombobox (Popover + Command)
│       └── ScrollArea
│           └── SidebarMenu
│               └── SidebarMenuItem × repos
│                   └── SidebarMenuButton + Button ghost (Trash2)
└── (sem SidebarFooter)
```

---

## RepoCombobox (`app/components/repo-combobox.tsx`)

Substituir implementação custom por `Popover` + `Command`:

- Trigger: `Button` com ícone Search + texto placeholder
- `CommandInput` para busca com debounce
- `CommandGroup` "Seus repositórios"
- `CommandGroup` "Busca no GitHub" (quando há resultados extras)
- `CommandEmpty` para estado vazio
- Botão de refresh (`RefreshCw`) ao lado do trigger

---

## PRGroup (`app/components/pr-group.tsx`)

Adicionar `Collapsible` para recolher seções:

```
Collapsible (defaultOpen baseado em prs.length > 0)
├── CollapsibleTrigger
│   └── ícone + título + Badge(contagem) + ChevronDown/Up
└── CollapsibleContent
    └── lista de PRCard | Skeleton (loading) | empty state
```

Grupos vazios colapsam por padrão. Grupos com PRs abrem por padrão.

---

## PRCard (`app/components/pr-card.tsx`)

Trocar `div` custom por `Card`:

```
Card (hover: bg-accent/50, cursor-pointer)
└── CardContent (p-3)
    ├── Avatar (shadcn) — foto do autor (h-8 w-8)
    └── div flex-1
        ├── link título (line-clamp-2) + ExternalLink icon
        └── metadata: repo#num · autor · data · comments · +add -del
            └── badges: CI status · aprovações · "small"
```

---

## Loading States

Substituir `SkeletonCard` manual por:

```tsx
<div className="flex flex-col gap-2">
  {Array.from({ length: 2 }).map((_, i) => (
    <Skeleton key={i} className="h-16 w-full rounded-md" />
  ))}
</div>
```

---

## Decisões Técnicas

- **SidebarProvider** deve envolver o componente raiz da rota (`DashboardPage`)
- **Command** usa `cmdk` como dependência — instalar via shadcn CLI
- **Collapsible** do Radix não tem animação por padrão; usar `data-[state=open]:animate-collapsible-down` do tailwind-animate se disponível
- Manter toda a lógica de dados intocada (`useDashboard`, `useRepos`, `groupPullRequests`)
