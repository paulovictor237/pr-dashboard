import { useQuery } from "@tanstack/react-query"
import { fetchAllPRsForRepos } from "@/lib/github"
import { groupPullRequests } from "@/lib/pr-groups"

export function useDashboard(
  token: string | null,
  repos: Array<string>,
  login: string
) {
  return useQuery({
    queryKey: ["dashboard", repos, login],
    queryFn: () => fetchAllPRsForRepos(token!, repos),
    enabled: !!token && repos.length > 0,
    select: (prs) => groupPullRequests(prs, login),
  })
}
