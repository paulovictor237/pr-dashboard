# PR Dashboard

Dashboard de code review focado no que realmente precisa de atenção agora.

## The Problem

Times de desenvolvimento frequentemente acumulam dezenas de Pull Requests abertas ao mesmo tempo. O processo mais comum acaba sendo um grupo no Slack onde cada pessoa posta seu próprio PR pedindo revisão.

Esse modelo gera muito ruído. Você vê todos os PRs, mas não necessariamente os que precisam da sua atenção.

O PR Dashboard tenta resolver esse problema mostrando apenas os repositórios que você acompanha e organizando os PRs abertos de acordo com o nível de prioridade. Assim fica mais fácil identificar o que precisa de ação primeiro.

A ideia é tornar o processo de code review mais democrático e organizado. Cada pessoa acompanha apenas os projetos que são relevantes para ela e vê apenas os PRs que ainda precisam de alguma atenção.

Também incentiva boas práticas, como marcar diretamente os revisores interessados. Quando isso acontece, o PR aparece na categoria **Inbox**, facilitando que a pessoa responsável veja rapidamente o que precisa revisar.

Além disso, o dashboard prioriza PRs que estão próximos de serem liberados, ou seja, aqueles que já passaram por revisões mas ainda não foram mergeados.

## How It Works

Os PRs abertos são classificados automaticamente em categorias de prioridade.

As categorias ajudam a entender rapidamente qual PR precisa de ação e qual já está encaminhado.

### Categories

|     | Categoria       | Quando aparece                                            |
| --- | --------------- | --------------------------------------------------------- |
| 🚀  | **Destravar**   | Você já revisou + autor fez novos commits ou comentários  |
| 📥  | **Inbox**       | Review solicitado diretamente para você + sem ação tomada |
| ⚡  | **Quick Wins**  | PRs pequenos (≤200 linhas alteradas)                      |
| 🏁  | **Finalização** | 1+ aprovação de terceiros + CI verde                      |
| ⏰  | **Alerta**      | Inatividade total por mais de 5 dias úteis                |
| 🔍  | **Exploração**  | Qualquer PR aberto que não se encaixou acima              |
| ✅  | **Aprovados**   | Aprovado por você, sem mudanças posteriores               |
| 🏆  | **Mergeados**   | Últimos 5 PRs mergeados                                   |

Essa organização permite começar sempre pelo que está bloqueando o fluxo do time ou mais próximo de ser entregue.

## Getting Started

Pré-requisito: um GitHub Personal Access Token com permissão de leitura nos repositórios.

[https://github.com/settings/tokens](https://github.com/settings/tokens/new?scopes=repo,read:user&description=PR+Dashboard)

Instale as dependências:

```bash
npm install
```

Execute o projeto:

```bash
npm run dev
```

Depois acesse:

```
http://localhost:5173
```

Cole seu token do GitHub e adicione os repositórios que deseja acompanhar.

O dashboard então começará a buscar os PRs abertos e classificá-los automaticamente.

## How It Was Built

O projeto foi inicializado usando um preset do shadcn.

[https://ui.shadcn.com/create](https://ui.shadcn.com/create)

Comando usado para criar o projeto:

```bash
npx shadcn@latest init --preset a1UpRA9 --template start
```

Também foram adicionadas algumas ferramentas para melhorar o fluxo de desenvolvimento com Claude Code.

### shadcn Skills

```bash
npx skills add shadcn/ui
```

### shadcn MCP

```bash
npx shadcn@latest mcp init --client claude
```

### Superpowers

Durante o desenvolvimento foram utilizadas as skills do projeto Superpowers, que ajudam a estruturar o pensamento antes de escrever código.

[https://github.com/obra/superpowers](https://github.com/obra/superpowers)

Instalação:

```bash
claude plugin install superpowers@claude-plugins-official
```

Alguns exemplos de uso no projeto:

```bash
# Usado para explorar ideias e definir funcionalidades.
/superpowers:brainstorming

# Usado para organizar o raciocínio e criar planos de implementação.
/superpowers:write-plan @docs/init-plan.md

# Usado para gerar código a partir do plano definido anteriormente.
/superpowers:write-code @app/components/pr-card.tsx
```

Mesmo para pequenas melhorias, as skills do Superpowers foram utilizadas para organizar melhor o raciocínio antes da implementação.

### OpenSpec

Atualmente estou testando a abordagem do [OpenSpec](https://github.com/Fission-AI/OpenSpec), um workflow experimental que estrutura o desenvolvimento em torno de especificações abertas — separando planejamento, design e implementação em artefatos versionados antes de escrever qualquer código.

## Contributing Ideas

O projeto está aberto a melhorias. Algumas ideias que ainda podem ser exploradas:

- [ ] criar tipos de ordenação diferente.
- [ ] filtros por projeto, data, autor ou outros critérios
- [ ] criar novas categorias ou adicionar mais informações aos cards
- [ ] login social com o github
- [ ] melhorias no projeto para ser focado em rotinas diárias de CR
- [ ] melhorias na interação com agentes e automação de testes para reduzir erros de LLM
- [ ] ranking gamificado dos maiores code reviewers do time
- [ ] painel colaborativo que incentive revisão entre desenvolvedores — exemplo: se você revisar um PR meu, eu reviso um seu
- [x] página com **Meus PRs**, mostrando PRs criados por você em todos os projetos seguidos: prontos para merge, em revisão, em desenvolvimento
