import { useQuery } from "@tanstack/react-query"
import { fetchUserRepos } from "~/lib/github"

export function useUserRepos(token: string) {
  return useQuery({
    queryKey: ["user-repos", token],
    queryFn: () => fetchUserRepos(token),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!token,
  })
}
