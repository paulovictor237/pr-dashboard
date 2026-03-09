import { useState } from "react"
import { Check, ChevronsUpDown, RefreshCw, Search } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useUserRepos } from "~/hooks/use-user-repos"
import { useSearchRepos } from "~/hooks/use-search-repos"
import type { RepoSuggestion } from "~/lib/github"
import { Button } from "~/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command"
import { Spinner } from "~/components/ui/spinner"
import { cn } from "~/lib/utils"

type Props = {
  token: string
  addedRepos: string[]
  onAdd: (repo: string) => void
}

export function RepoCombobox({ token, addedRepos, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const queryClient = useQueryClient()

  const { data: userRepos = [], isFetching: fetchingUser } = useUserRepos(token)
  const { data: searchResults = [], isFetching: loadingSearch } = useSearchRepos(token, query)

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["user-repos", token] })
    queryClient.invalidateQueries({ queryKey: ["search-repos", token] })
  }

  const filteredUserRepos =
    query.length === 0
      ? userRepos
      : userRepos.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase()))

  const userRepoNames = new Set(userRepos.map((r) => r.full_name))
  const extraSearchResults = searchResults.filter((r) => !userRepoNames.has(r.full_name))

  function handleSelect(repo: RepoSuggestion) {
    if (addedRepos.includes(repo.full_name)) return
    onAdd(repo.full_name)
    setQuery("")
    setOpen(false)
  }

  const hasResults = filteredUserRepos.length > 0 || extraSearchResults.length > 0

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="h-8 flex-1 justify-between text-xs font-normal"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              Buscar repositório...
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar repositório..."
              value={query}
              onValueChange={setQuery}
              className="text-xs"
            />
            <CommandList>
              {!hasResults && !loadingSearch && (
                <CommandEmpty className="text-xs">
                  {query.length >= 2 ? "Nenhum repositório encontrado" : "Digite para buscar"}
                </CommandEmpty>
              )}

              {filteredUserRepos.length > 0 && (
                <CommandGroup heading="Seus repositórios">
                  {filteredUserRepos.map((repo) => (
                    <CommandItem
                      key={repo.full_name}
                      value={repo.full_name}
                      disabled={addedRepos.includes(repo.full_name)}
                      onSelect={() => handleSelect(repo)}
                      className="text-xs"
                    >
                      <span className="truncate">{repo.full_name}</span>
                      {addedRepos.includes(repo.full_name) && (
                        <Check className={cn("ml-auto h-3 w-3")} />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {filteredUserRepos.length > 0 && extraSearchResults.length > 0 && (
                <CommandSeparator />
              )}

              {extraSearchResults.length > 0 && (
                <CommandGroup heading="Busca no GitHub">
                  {extraSearchResults.map((repo) => (
                    <CommandItem
                      key={repo.full_name}
                      value={repo.full_name}
                      onSelect={() => handleSelect(repo)}
                      className="text-xs"
                    >
                      <span className="truncate">{repo.full_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {loadingSearch && (
                <div className="flex items-center justify-center py-3">
                  <Spinner className="size-3.5" />
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleRefresh}
        title="Recarregar repositórios"
        className="size-8 shrink-0"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", fetchingUser && "animate-spin")} />
      </Button>
    </div>
  )
}
