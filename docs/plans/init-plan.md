# Definindo o conteúdo do documento de design atualizado para TanStack Start

design_doc_content = """# Design Doc: Dashboard de Pull Requests para Gestores (TanStack Start Edition)

**Data:** 2026-03-07
**Status:** Aprovado
**Autor:** Brainstorming AI & User

## 1. Visão Geral

Dashboard de consulta diária focado em alta performance e type-safety para gestores de engenharia. Utiliza TanStack Start para entregar uma experiência de "App Nativo" no monitoramento de PRs da organização.

## 2. Stack Técnica

- **Framework:** TanStack Start (Full-stack Router + Vinxi).
- **Roteamento:** TanStack Router (Type-safe routes/params).
- **Autenticação:** Custom OAuth 2.0 via GitHub.
  - **Server Functions:** Troca de `code` por `access_token` protegendo o `CLIENT_SECRET`.
  - **Session:** Armazenamento via Cookies seguros (httpOnly).
- **Gerenciamento de Dados:** TanStack Query integrado.
- **UI:** shadcn/ui + Tailwind CSS.
- **Persistência Local:** LocalStorage para IDs de repositórios monitorados.

## 3. Arquitetura de Autenticação Customizada

1. O usuário clica em "Login" -> Redirecionamento para GitHub.
2. Callback captura o código na URL via TanStack Router.
3. Uma `Server Function` é disparada para validar o código no servidor e gerar o cookie de sessão.
4. O frontend utiliza o token para realizar chamadas diretas à API do GitHub (Client-side) para otimizar o Rate Limit por IP.

## 4. Hierarquia de Grupos (Funil de Cobertura 100%)

Os PRs seguem uma ordem de precedência rigorosa para evitar duplicidade:

1. **🚀 Destravar:** Revisados pelo usuário + Atividade nova (commits/comentários) do autor.
2. **📥 Inbox:** `review-requested` direto para o usuário + Nenhuma ação tomada.
3. **⚡ Quick Wins:** PRs pequenos (< 5 arq / < 50 linhas) + Sem solicitação ou interação do usuário.
4. **🏁 Finalização:** 1+ aprovação de terceiros + CI Verde + Sem aprovação do usuário.
5. **⏰ Alerta (Stale):** Inatividade absoluta (zero commits/comentários) por > 5 dias úteis.
6. **🔍 Exploração:** Catch-all para qualquer PR aberto que não se encaixou acima.
7. **✅ Aprovados:** Status `APPROVED` pelo usuário + Nenhuma mudança posterior.
8. **🏆 Mergeados:** Lista dos últimos 5 PRs com status `MERGED`.

## 5. UI/UX e Performance

- **Zero CLS:** Graças à tipagem e loaders do TanStack Router.
- **Skeletons:** Carregamento progressivo de cada seção via TanStack Query.
- **Sidebar:** Gerenciamento de repositórios favoritos e filtros de exibição.
  """
