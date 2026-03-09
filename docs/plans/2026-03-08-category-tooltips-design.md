# Design Doc: Tooltips e Estado Vazio nas Categorias do Dashboard

**Data:** 2026-03-08
**Status:** Aprovado

## Visão Geral

Adicionar descrições acessíveis via tooltip em cada categoria do dashboard de PRs, e tornar todas as categorias sempre visíveis mesmo quando vazias.

## Mudanças

### 1. Tooltip no header das categorias

O header de cada `PRGroup` (emoji + título + badge) passa a ser envolvido por um `Tooltip` do shadcn/ui. Hover em qualquer parte do header revela a descrição da categoria. A prop `description` é opcional — o tooltip só é renderizado se ela existir.

### 2. Categorias sempre visíveis

Remove o early return `if (!isLoading && prs.length === 0) return null`. Quando uma categoria está vazia e não está carregando, exibe uma linha `text-xs text-muted-foreground italic` com _"Nenhum PR nessa categoria"_.

## Descrições das Categorias

| Grupo | Descrição |
|-------|-----------|
| 🚀 Destravar | PRs que você já revisou e onde o autor fez novos commits ou comentários após sua revisão |
| 📥 Inbox | PRs com revisão solicitada diretamente para você e que ainda não foram respondidas |
| ⚡ Quick Wins | PRs pequenos (≤200 linhas) sem interação sua — revisões rápidas de encaixar |
| 🏁 Finalização | PRs com aprovação de terceiros e CI verde aguardando apenas seu merge ou aprovação final |
| ⏰ Alerta (Stale) | PRs sem nenhuma atividade (commits ou comentários) nos últimos 5 dias úteis |
| 🔍 Exploração | PRs abertos que não se encaixam em nenhuma outra categoria |
| ✅ Aprovados | PRs que você aprovou e que não tiveram mudanças desde então |
| 🏆 Mergeados | Os últimos 5 PRs que foram mergeados nos repositórios monitorados |

## Arquivos Afetados

- `app/routes/home.tsx` — adiciona campo `description` ao array `GROUPS`
- `app/components/pr-group.tsx` — recebe prop `description`, envolve header em Tooltip, trata estado vazio
