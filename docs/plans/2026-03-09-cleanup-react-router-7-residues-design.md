# Design: Limpeza de Resíduos React Router 7

**Data:** 2026-03-09
**Status:** Aprovado

## Contexto

O projeto usa TanStack Start (`@tanstack/react-start`) + TanStack Router (`@tanstack/react-router`) como stack de roteamento e SSR. Alguns arquivos foram importados de um projeto anterior que usava React Router 7 e ainda carregam padrões legados daquele framework.

## Problema

`lib/session.server.ts` usa o pacote `cookie` para serializar e parsear cookies manualmente — padrão do React Router 7, onde o desenvolvedor manipulava o header `Set-Cookie` diretamente. No TanStack Start, isso é feito via `getCookie`/`setCookie`/`deleteCookie` de `@tanstack/react-start/server`, que `auth.server.ts` já usa corretamente. O arquivo é completamente não utilizado pela aplicação (apenas referenciado pelo seu próprio test file).

## Escopo

### O que será removido

- `src/lib/session.server.ts` — dead code, padrão React Router 7
- `src/lib/session.server.test.ts` — testes do arquivo removido

### O que será atualizado

- `package.json` — remover dependência `cookie` (e `@types/cookie`) se não utilizada em outro lugar
- `CLAUDE.md` — corrigir documentação de arquitetura (de React Router 7 para TanStack Start) e remover `session.server.ts` da lista de Key Files

### O que NÃO será alterado

- `document.cookie` em `sidebar.tsx` — correto para uso client-side; as utilities do TanStack Start são server-only
- `auth.server.ts` — já usa TanStack Start corretamente
- Qualquer lógica de negócio ou componente de UI

## Resultado Esperado

Codebase sem dead code legado, com documentação refletindo a stack real (TanStack Start).
