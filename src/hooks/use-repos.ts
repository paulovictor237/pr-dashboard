import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "pr-dashboard:repos"

export function parseRepos(raw: string): Array<string> {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRepo(repos: Array<string>, repo: string): Array<string> {
  if (repos.includes(repo)) return repos
  return [...repos, repo]
}

export function removeRepo(repos: Array<string>, repo: string): Array<string> {
  return repos.filter((r) => r !== repo)
}

export function useRepos() {
  const [repos, setRepos] = useState<Array<string>>([])

  const load = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ""
    setRepos(parseRepos(stored))
  }, [])

  useEffect(() => {
    load()

    // Sync across instances in the same tab
    const handler = (e: CustomEvent) => {
      if (e.detail?.repos) {
        setRepos(e.detail.repos)
      } else {
        load()
      }
    }

    window.addEventListener("repos-updated" as any, handler)
    window.addEventListener("storage", load) // Sync across tabs

    return () => {
      window.removeEventListener("repos-updated" as any, handler)
      window.removeEventListener("storage", load)
    }
  }, [load])

  const save = useCallback((updated: Array<string>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setRepos(updated)
    // Notify other instances in the same tab
    window.dispatchEvent(
      new CustomEvent("repos-updated", { detail: { repos: updated } })
    )
  }, [])

  const add = useCallback(
    (repo: string) => save(addRepo(repos, repo)),
    [repos, save]
  )

  const remove = useCallback(
    (repo: string) => save(removeRepo(repos, repo)),
    [repos, save]
  )

  return { repos, add, remove, refresh: load }
}
