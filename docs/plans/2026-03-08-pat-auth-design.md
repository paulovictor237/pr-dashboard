# Design Doc: Autenticação via Personal Access Token (PAT)

**Data:** 2026-03-08
**Status:** Aprovado
**Substitui:** Seção 3 do `init-plan.md` (OAuth customizado)

## 1. Contexto

O fluxo OAuth original exige que um operador configure um GitHub OAuth App (`CLIENT_ID` + `CLIENT_SECRET`) antes que qualquer usuário possa logar. Para um dashboard de uso pessoal/interno, isso cria uma dependência desnecessária de infraestrutura.

## 2. Solução

Cada usuário autentica com seu próprio GitHub Personal Access Token (PAT). O token é validado no client-side via `GET https://api.github.com/user` e persistido em cookie simples (não-httpOnly) com duração de 30 dias.

## 3. Arquitetura

### Fluxo de Login

1. Usuário acessa `/login`
2. Cola o PAT no campo de texto
3. Frontend chama `GET /user` na API do GitHub com o token
4. Se válido: salva em cookie `gh_token` (max-age=30d) + redireciona para `/`
5. Se inválido: exibe erro inline

### Proteção de Rotas

- Loaders server-side leem o cookie `gh_token`
- Se ausente ou inválido: `redirect("/login")`
- Evita flash de conteúdo não-autorizado no SSR

### Logout

- Remove cookie `gh_token`
- Redireciona para `/login`

## 4. Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `app/routes/login.tsx` | Substituir botão OAuth por formulário PAT |
| `app/routes/auth.github.tsx` | Deletar |
| `app/routes/auth.callback.tsx` | Deletar |
| `app/lib/auth.server.ts` | Simplificar: ler/escrever cookie plain |
| `app/lib/session.server.ts` | Deletar |
| `app/lib/env.server.ts` | Remover `CLIENT_ID`, `CLIENT_SECRET`, `SESSION_SECRET` |
| `app/routes.ts` | Remover rotas `/auth/github` e `/auth/callback` |

## 5. Variáveis de Ambiente

Nenhuma variável necessária para autenticação. O `.env` do projeto pode ser completamente removido ou usado apenas para outras configurações futuras.

## 6. UX da Tela de Login

- Campo de texto com label "GitHub Personal Access Token"
- Link para `https://github.com/settings/tokens/new` com escopos recomendados (`repo`, `read:user`)
- Botão "Entrar" — desabilitado enquanto valida
- Mensagem de erro inline se token inválido ou sem permissão
- Sessão dura 30 dias sem re-autenticação

## 7. Escopos Necessários do PAT

- `repo` — leitura de pull requests e repositórios
- `read:user` — identificar o usuário logado (para lógica de grupos de PRs)

## 8. Trade-offs

**Aceito:** Cookie não-httpOnly (token legível pelo JS) — risco mitigado pelo escopo limitado do PAT e contexto de uso interno.

**Ganho:** Zero infraestrutura de auth, zero variáveis de ambiente, cada usuário é autônomo.
