import { ChevronsUpDown, GithubIcon, GitPullRequest, LayoutDashboard, LogOut, Trash2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useRepos } from "@/hooks/use-repos"
import { RepoCombobox } from "@/components/repo-combobox"
import { PRIcon } from "@/components/pr-icon"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Props = {
  onLogout: () => void
  userLogin: string
  userAvatar: string
  token: string
}

export function AppSidebar({ onLogout, userLogin, userAvatar, token }: Props) {
  const { repos, add, remove } = useRepos()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <PRIcon size={24} />
          <span className="text-sm font-semibold">PR Dashboard</span>
          <a
            href="https://github.com/paulovictor237/pr-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center justify-center h-7 w-7 rounded-md text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all duration-200"
            title="Ver no GitHub"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton>
              <Avatar size="sm">
                <AvatarImage src={userAvatar} alt={userLogin} />
                <AvatarFallback>{userLogin[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userLogin}</p>
                <p className="text-xs text-muted-foreground">GitHub</p>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start">
            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut data-icon="inline-start" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/home" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/my-prs" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
                    <GitPullRequest className="h-4 w-4" />
                    <span>Meus PRs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Repositórios</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <RepoCombobox token={token} addedRepos={repos} onAdd={add} />
            <SidebarMenu>
              {repos.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Adicione repositórios para monitorar
                </p>
              ) : (
                repos.map((repo) => (
                  <SidebarMenuItem key={repo}>
                    <SidebarMenuButton className="text-xs" title={repo}>
                      <span className="truncate">{repo}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => remove(repo)}
                      title="Remover"
                      className="hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
