import type { EnrichedPR } from "~/lib/github.types"

export const BUSINESS_DAYS_THRESHOLD = 5

type PRGroups = {
  unlock: EnrichedPR[]    // 1. Destravar
  inbox: EnrichedPR[]     // 2. Inbox
  quickWins: EnrichedPR[] // 3. Quick Wins
  stale: EnrichedPR[]     // 4. Alerta (Stale)
  explore: EnrichedPR[]   // 5. Exploração
  approved: EnrichedPR[]  // 6. Aprovados
  merged: EnrichedPR[]    // 7. Mergeados
}

function businessDaysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  let days = 0
  const current = new Date(date)
  while (current < now) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days++
    current.setDate(current.getDate() + 1)
  }
  return days
}

function isMerged(pr: EnrichedPR): boolean {
  return pr.merged_at !== null
}

function isApprovedByMe(pr: EnrichedPR, me: string): boolean {
  const myLatestReview = pr.reviews
    .filter((r) => r.user.login === me)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
  return myLatestReview?.state === "APPROVED"
}

function hasNewActivityAfterMyApproval(pr: EnrichedPR, me: string): boolean {
  const myLatestApproval = pr.reviews
    .filter((r) => r.user.login === me && r.state === "APPROVED")
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
  if (!myLatestApproval) return false
  return new Date(pr.updated_at) > new Date(myLatestApproval.submitted_at)
}

function isReviewRequestedForMe(pr: EnrichedPR, me: string): boolean {
  return pr.requested_reviewers.some((r) => r.login === me)
}

function hasIInteracted(pr: EnrichedPR, me: string): boolean {
  return pr.reviews.some((r) => r.user.login === me)
}

function isSmall(pr: EnrichedPR): boolean {
  return pr.changed_files < 5 && pr.additions + pr.deletions < 50
}

function hasCIGreen(pr: EnrichedPR): boolean {
  const completed = pr.check_runs.filter((c) => c.status === "completed")
  if (completed.length === 0) return false
  return completed.every((c) => c.conclusion === "success" || c.conclusion === "neutral" || c.conclusion === "skipped")
}

function hasThirdPartyApproval(pr: EnrichedPR, me: string): boolean {
  return pr.reviews.some((r) => r.user.login !== me && r.user.login !== pr.user.login && r.state === "APPROVED")
}

function isStale(pr: EnrichedPR): boolean {
  return businessDaysSince(pr.updated_at) > BUSINESS_DAYS_THRESHOLD
}

function isUnlock(pr: EnrichedPR, me: string): boolean {
  // Revisei + atividade nova do autor após minha revisão
  if (!hasIInteracted(pr, me)) return false
  const myLastReview = pr.reviews
    .filter((r) => r.user.login === me)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
  if (!myLastReview) return false
  return new Date(pr.updated_at) > new Date(myLastReview.submitted_at)
}

export function groupPullRequests(prs: EnrichedPR[], me: string): PRGroups {
  const groups: PRGroups = {
    unlock: [],
    inbox: [],
    quickWins: [],
    stale: [],
    explore: [],
    approved: [],
    merged: [],
  }

  for (const pr of prs) {
    // 8. Mergeados (últimos 5 são filtrados no caller)
    if (isMerged(pr)) {
      groups.merged.push(pr)
      continue
    }

    // PRs prontos para merge (aprovação de terceiros + CI verde) — não precisam de ação de revisão
    if (hasThirdPartyApproval(pr, me) && hasCIGreen(pr)) {
      continue
    }

    // 6. Aprovados — aprovei e nenhuma mudança depois
    if (isApprovedByMe(pr, me) && !hasNewActivityAfterMyApproval(pr, me)) {
      groups.approved.push(pr)
      continue
    }

    // 1. Destravar — interagi + nova atividade após minha revisão
    if (isUnlock(pr, me)) {
      groups.unlock.push(pr)
      continue
    }

    // 2. Inbox — review-requested para mim + não interagi ainda
    if (isReviewRequestedForMe(pr, me) && !hasIInteracted(pr, me)) {
      groups.inbox.push(pr)
      continue
    }

    // 3. Quick Wins — PR pequeno + sem minha solicitação ou interação
    if (isSmall(pr) && !isReviewRequestedForMe(pr, me) && !hasIInteracted(pr, me)) {
      groups.quickWins.push(pr)
      continue
    }

    // 4. Stale — inatividade > 5 dias úteis
    if (isStale(pr)) {
      groups.stale.push(pr)
      continue
    }

    // 5. Exploração — catch-all
    groups.explore.push(pr)
  }

  // Manter apenas últimos 5 mergeados
  groups.merged = groups.merged
    .sort((a, b) => new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime())
    .slice(0, 5)

  return groups
}
