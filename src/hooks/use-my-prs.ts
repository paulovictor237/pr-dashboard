import { useQuery } from "@tanstack/react-query"
import { fetchMyOpenPRs } from "@/lib/github"
import type { EnrichedPR } from "@/lib/github.types"

export type MyPRGroups = {
  needsRevision: Array<EnrichedPR>
  waitingFeedback: Array<EnrichedPR>
  waitingReview: Array<EnrichedPR>
  readyToMerge: Array<EnrichedPR>
}

function groupMyPRs(prs: Array<EnrichedPR>, login: string): MyPRGroups {
  const sorted = [...prs].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  const groups: MyPRGroups = {
    needsRevision: [],
    waitingFeedback: [],
    waitingReview: [],
    readyToMerge: [],
  }

  for (const pr of sorted) {
    const reviewerMap = new Map<string, string>()
    for (const review of pr.reviews) {
      if (review.user.login !== login && review.state !== "COMMENTED") {
        reviewerMap.set(review.user.login, review.state)
      }
    }

    const states = Array.from(reviewerMap.values())

    if (states.includes("CHANGES_REQUESTED")) {
      const latestChangesRequested = pr.reviews
        .filter((r) => r.user.login !== login && r.state === "CHANGES_REQUESTED")
        .sort(
          (a, b) =>
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )
        .at(0)

      const updatedAfterReview =
        latestChangesRequested &&
        new Date(pr.updated_at) > new Date(latestChangesRequested.submitted_at)

      if (updatedAfterReview) {
        groups.waitingFeedback.push(pr)
      } else {
        groups.needsRevision.push(pr)
      }
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
