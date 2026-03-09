# Design: README Rewrite

**Date:** 2026-03-09
**Goal:** Rewrite README as a product-first showcase — light, inviting, focused on problem/solution.

## Audience

Personal project / open source showcase. Not heavy technical docs.

## Structure

1. **Header** — name + one-line tagline
2. **O Problema** — motivation (Slack group pain, democratizing code review)
3. **Como funciona** — 8 categories table (updated from CLAUDE.md)
4. **Como rodar** — `npm install && npm run dev`, GitHub PAT prerequisite
5. **Ideias para contribuir** — existing ideas list, cleaned up
6. **Como foi construído** — short history (shadcn preset + Superpowers)

## Categories to use (from CLAUDE.md)

| Emoji | Nome | Condição |
|-------|------|----------|
| 🚀 | Destravar | Revisados pelo usuário + atividade nova |
| 📥 | Inbox | Review solicitado diretamente ao usuário |
| ⚡ | Quick Wins | PRs pequenos (≤200 linhas) |
| 🏁 | Finalização | 1+ aprovação + CI verde |
| ⏰ | Alerta (Stale) | Inatividade > 5 dias úteis |
| 🔍 | Exploração | Catch-all |
| ✅ | Aprovados | Aprovado pelo usuário, sem mudanças posteriores |
| 🏆 | Mergeados | Últimos 5 PRs mergeados |
