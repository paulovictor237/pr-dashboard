import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import type { EnrichedPR } from "@/lib/github.types"
import { PRCard } from "@/components/pr-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  icon: string
  prs: Array<EnrichedPR>
  isLoading?: boolean
  description?: string
}

export function PRGroup({ title, icon, prs, isLoading, description }: Props) {
  const [open, setOpen] = useState(!!isLoading || prs.length > 0)
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (!userToggled && (isLoading || prs.length > 0)) {
      setOpen(true)
    }
  }, [isLoading, prs.length, userToggled])

  function handleOpenChange(value: boolean) {
    setUserToggled(true)
    setOpen(value)
  }

  const trigger = (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="sm" className="gap-2 px-2">
        <span>{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {!isLoading && <Badge variant="secondary">{prs.length}</Badge>}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </Button>
    </CollapsibleTrigger>
  )

  return (
    <Collapsible
      open={open}
      onOpenChange={handleOpenChange}
      className="flex flex-col gap-3"
    >
      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-fit">{trigger}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            {description}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <CollapsibleContent className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))
        ) : prs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum PR nessa categoria
          </p>
        ) : (
          prs.map((pr) => (
            <PRCard key={`${pr.repo_full_name}-${pr.number}`} pr={pr} />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
