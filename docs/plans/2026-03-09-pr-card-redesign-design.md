# PR Card Redesign

**Data:** 2026-03-09

## Problema

O `PRCard` atual coloca o título em destaque e esconde os indicadores de status (CI, reviews) no rodapé com o mesmo peso visual dos metadados secundários. Isso não responde a pergunta principal do usuário ao escanear o dashboard: **"O que está acontecendo com esse PR?"**

Outros problemas:
- Componentes não comunicam bem o que significam (dependem de tooltip para serem legíveis)
- "por {autor}" é redundante com o avatar
- Badge "pequeno" não comunica nada acionável
- Todos os elementos têm o mesmo peso visual

## Design

### Hierarquia de informação

```
[avatar]  título do PR longo...  ↗  [rascunho]
          [✅ CI passou]  [👍 2 aprovações]  [✋ mudanças]
          repo#123 · há 2h · +45 −12 · 💬3
```

**Linha 1 — título**
- Avatar `sm` alinhado ao topo (tooltip com nome do autor)
- Título com link externo
- Badge `outline` "rascunho" se `pr.draft === true`

**Linha 2 — status** *(responde "o que está acontecendo?")*
- Badges com ícone + texto curto — legíveis sem tooltip
- CI: `✅ CI passou` (verde) · `❌ CI falhou` (vermelho) · `⏳ CI rodando` (neutro, animado)
- Reviews: `👍 2 aprovações` (secundário, verde) · `✋ mudanças pedidas` (destrutivo)
- Se não há CI nem reviews: linha omitida completamente

**Linha 3 — metadados secundários**
- `repo#123` · `há 2h` · `+45 −12` · `💬3`
- Tudo em `text-xs text-muted-foreground`, mesmo peso visual

### O que foi removido
- Texto "por {autor}" — redundante com avatar
- Badge "pequeno" — não comunica nada acionável

### Componentes shadcn utilizados
- `Card`, `CardContent` — estrutura base
- `Badge` — indicadores de status com variantes `default`, `secondary`, `destructive`, `outline`
- `Avatar`, `AvatarImage`, `AvatarFallback` — autor
- `Tooltip`, `TooltipTrigger`, `TooltipContent` — metadados secundários (tempo exato, contagem)

## Motivação da abordagem

O fluxo vertical título → status → metadados respeita o padrão natural do shadcn (composição inline, sem grids forçados) e coloca a informação mais importante na posição de leitura natural — após o título, antes dos detalhes secundários.
