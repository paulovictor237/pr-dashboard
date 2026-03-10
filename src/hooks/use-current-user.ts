import { useQuery } from "@tanstack/react-query"
import { fetchCurrentUser } from "@/lib/github"

export function useCurrentUser(token: string | null) {
  return useQuery({
    queryKey: ["currentUser", token],
    queryFn: () => fetchCurrentUser(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 min
  })
}
