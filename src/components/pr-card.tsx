import {
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  Loader2,
  MessageSquare,
  XCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { EnrichedPR } from "@/lib/github.types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Props = {
  pr: EnrichedPR
}

function CIStatus({ pr }: { pr: EnrichedPR }) {
  const inProgress = pr.check_runs.some((c) => c.status === "in_progress")
  const completed = pr.check_runs.filter((c) => c.status === "completed")

  if (inProgress)
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        CI rodando
      </Badge>
    )

  if (completed.length === 0)
    return (
      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
        sem CI
      </Badge>
    )

  const allGreen = completed.every(
    (c) =>
      c.conclusion === "success" ||
      c.conclusion === "neutral" ||
      c.conclusion === "skipped"
  )

  return allGreen ? (
    <Badge variant="secondary" className="gap-1 text-xs text-green-500">
      <CheckCircle2 className="h-3 w-3" />
      CI passou
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1 text-xs">
      <XCircle className="h-3 w-3" />
      CI falhou
    </Badge>
  )
}

function ReviewStatus({ pr }: { pr: EnrichedPR }) {
  const changesRequested = pr.reviews.some(
    (r) => r.state === "CHANGES_REQUESTED"
  )
  const approvals = pr.reviews.filter((r) => r.state === "APPROVED").length

  if (!changesRequested && approvals === 0)
    return (
      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
        sem revisão
      </Badge>
    )

  return (
    <>
      {changesRequested && (
        <Badge variant="destructive" className="gap-1 text-xs">
          <XCircle className="h-3 w-3" />
          mudanças pedidas
        </Badge>
      )}
      {approvals > 0 && (
        <Badge variant="secondary" className="gap-1 text-xs text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          {approvals === 1 ? "1 aprovação" : `${approvals} aprovações`}
        </Badge>
      )}
    </>
  )
}

export function PRCard({ pr }: Props) {
  const repoName = pr.repo_full_name.split("/")[1] ?? pr.repo_full_name
  const updatedAt = formatDistanceToNow(new Date(pr.updated_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar size="lg" className="mt-0.5 shrink-0 cursor-default">
              <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
              <AvatarFallback>{pr.user.login[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>Autor: {pr.user.login}</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1">
          {/* Linha 1: título */}
          <div className="flex items-start gap-2">
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 flex min-w-0 items-start gap-1 text-sm leading-snug font-medium hover:text-primary"
            >
              {pr.title}
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
            {pr.draft && (
              <Badge
                variant="outline"
                className="shrink-0 text-xs text-muted-foreground"
              >
                rascunho
              </Badge>
            )}
          </div>

          {/* Linha 2: status */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <CIStatus pr={pr} />
            <ReviewStatus pr={pr} />
          </div>

          {/* Linha 3: metadados secundários */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-default items-center gap-1 text-xs text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  {repoName}#{pr.number}
                </span>
              </TooltipTrigger>
              <TooltipContent>Repositório e número do PR</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-default items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {updatedAt}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Última atualização:{" "}
                {new Date(pr.updated_at).toLocaleString("pt-BR")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  <span className="text-xs text-green-600">
                    +{pr.additions}
                  </span>
                  <span className="text-xs text-muted-foreground"> / </span>
                  <span className="text-xs text-red-500">-{pr.deletions}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {pr.additions} linhas adicionadas, {pr.deletions} removidas (
                {pr.changed_files} arquivo{pr.changed_files !== 1 ? "s" : ""})
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-default items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {pr.comments_count}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {pr.comments_count === 1
                  ? "1 comentário"
                  : `${pr.comments_count} comentários`}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
