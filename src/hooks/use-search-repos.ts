import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { searchRepos } from "~/lib/github"

export function useSearchRepos(token: string, query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ["search-repos", token, debouncedQuery],
    queryFn: () => searchRepos(token, debouncedQuery),
    enabled: !!token && debouncedQuery.length >= 2,
    staleTime: 60 * 1000, // 1 minuto
  })
}
