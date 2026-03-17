import { useQuery } from "@tanstack/react-query"
import { fetchMyOpenPRs } from "@/lib/github"
import type { EnrichedPR } from "@/lib/github.types"

export type MyPRGroups = {
  needsRevision: Array<EnrichedPR>
  waitingReview: Array<EnrichedPR>
  readyToMerge: Array<EnrichedPR>
}

function groupMyPRs(prs: Array<EnrichedPR>, login: string): MyPRGroups {
  const groups: MyPRGroups = {
    needsRevision: [],
    waitingReview: [],
    readyToMerge: [],
  }

  for (const pr of prs) {
    // Get latest review state per reviewer (excluding comments-only)
    const reviewerMap = new Map<string, string>()
    for (const review of pr.reviews) {
      if (review.user.login !== login && review.state !== "COMMENTED") {
        reviewerMap.set(review.user.login, review.state)
      }
    }

    const states = Array.from(reviewerMap.values())

    if (states.includes("CHANGES_REQUESTED")) {
      groups.needsRevision.push(pr)
    } else if (states.includes("APPROVED")) {
      groups.readyToMerge.push(pr)
    } else {
      groups.waitingReview.push(pr)
    }
  }

  return groups
}

export function useMyPRs(token: string | null, login: string) {
  return useQuery({
    queryKey: ["my-prs", login],
    queryFn: () => fetchMyOpenPRs(token!, login),
    enabled: !!token && !!login,
    select: (prs) => groupMyPRs(prs, login),
  })
}
