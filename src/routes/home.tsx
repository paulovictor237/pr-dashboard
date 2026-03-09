import { redirect } from "react-router"
import type { Route } from "./+types/home"
import { RefreshCw } from "lucide-react"
import { requireAuth } from "~/lib/auth.server"
import { fetchCurrentUser } from "~/lib/github"
import { clearTokenCookie } from "~/lib/session.server"
import { useDashboard } from "~/hooks/use-dashboard"
import { useRepos } from "~/hooks/use-repos"
import { AppSidebar } from "~/components/app-sidebar"
import { PRGroup } from "~/components/pr-group"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { Empty, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription } from "~/components/ui/empty"
import { cn } from "~/lib/utils"

export async function loader({ request }: Route.LoaderArgs) {
  const token = await requireAuth(request)
  const user = await fetchCurrentUser(token)
  return { token, user }
}

export async function action({ request }: Route.ActionArgs) {
  throw redirect("/login", {
    headers: { "Set-Cookie": clearTokenCookie() },
  })
}

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

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { token, user } = loaderData
  const { repos, refresh: refreshRepos } = useRepos()
  const {
    data: groups,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDashboard(token, repos, user.login)

  function handleRefresh() {
    refreshRepos()
    refetch()
  }

  async function handleLogout() {
    await fetch("/?index", { method: "POST" })
    window.location.href = "/login"
  }

  const totalOpen = groups
    ? GROUPS.slice(0, 6).reduce((sum, g) => sum + groups[g.key].length, 0)
    : 0

  return (
    <SidebarProvider>
      <AppSidebar
        onLogout={handleLogout}
        userLogin={user.login}
        userAvatar={user.avatar_url}
        token={token}
      />

      <SidebarInset>
        {/* Header */}
        <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">Pull Requests</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isFetching}
                className="h-7 w-7"
                title="Atualizar"
              >
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              </Button>
            </div>
            {!isLoading && (
              <span className="text-muted-foreground text-sm">
                {repos.length === 0
                  ? "Adicione repositórios na sidebar"
                  : `${totalOpen} PRs em aberto`}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-col gap-6 p-6">
          {repos.length === 0 ? (
            <Empty className="py-20">
              <EmptyHeader>
                <EmptyMedia>
                  <span className="text-4xl">📭</span>
                </EmptyMedia>
                <EmptyTitle>Nenhum repositório adicionado ainda.</EmptyTitle>
                <EmptyDescription>Use a sidebar para adicionar repositórios.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : isError ? (
            <Empty className="py-20">
              <EmptyHeader>
                <EmptyTitle>Erro ao carregar PRs.</EmptyTitle>
                <EmptyDescription>Verifique seu token e tente novamente.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
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
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
