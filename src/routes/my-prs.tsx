import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { deleteCookie } from "@tanstack/react-start/server"
import { RefreshCw } from "lucide-react"
import { useMyPRs } from "@/hooks/use-my-prs"
import { useCurrentUser } from "@/hooks/use-current-user"
import { AppSidebar } from "@/components/app-sidebar"
import { PRGroup } from "@/components/pr-group"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

const logoutFn = createServerFn({ method: "POST" }).handler(() => {
  deleteCookie("gh_token", { path: "/" })
})

export const Route = createFileRoute("/my-prs")({
  beforeLoad: ({ context }) => {
    if (!context.token) throw redirect({ to: "/login" })
  },
  loader: ({ context }) => ({ token: context.token! }),
  component: MyPRsPage,
})

const GROUPS = [
  {
    key: "needsRevision" as const,
    title: "Precisa de Ajuste",
    icon: "🔄",
    description: "PRs seus onde algum revisor solicitou mudanças.",
  },
  {
    key: "waitingReview" as const,
    title: "Aguardando Revisão",
    icon: "👀",
    description: "PRs seus que ainda não receberam nenhuma revisão.",
  },
  {
    key: "readyToMerge" as const,
    title: "Pronto para Merge",
    icon: "✅",
    description: "PRs seus que foram aprovados e estão prontos para merge.",
  },
]

function MyPRsPage() {
  const { token } = Route.useLoaderData()
  const { data: user } = useCurrentUser(token)
  const navigate = useNavigate()
  const router = useRouter()

  const {
    data: groups,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useMyPRs(token, user?.login ?? "")

  async function handleLogout() {
    await logoutFn()
    await router.invalidate()
    await navigate({ to: "/login" })
  }

  const totalOpen = groups
    ? GROUPS.reduce((sum, g) => sum + groups[g.key].length, 0)
    : 0

  return (
    <SidebarProvider>
      <AppSidebar
        onLogout={handleLogout}
        userLogin={user?.login ?? ""}
        userAvatar={user?.avatar_url ?? ""}
        token={token}
      />

      <SidebarInset>
        {/* Header */}
        <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">Meus PRs</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-7 w-7"
                title="Atualizar"
              >
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              </Button>
            </div>
            {!isLoading && (
              <span className="text-muted-foreground text-sm">
                {totalOpen} PRs em aberto
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-col gap-6 p-6">
          {isError ? (
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

