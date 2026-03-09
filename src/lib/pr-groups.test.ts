import { describe, expect, it } from "vitest"
import type { EnrichedPR } from "@/lib/github.types"
import { groupPullRequests } from "@/lib/pr-groups"

// Helper para criar PRs com defaults razoáveis
function makePR(overrides: Partial<EnrichedPR>): EnrichedPR {
  const now = new Date().toISOString()
  return {
    id: Math.random(),
    number: 1,
    title: "Test PR",
    html_url: "https://github.com/org/repo/pull/1",
    state: "open",
    draft: false,
    merged_at: null,
    created_at: now,
    updated_at: now,
    user: { login: "author", avatar_url: "" },
    requested_reviewers: [],
    additions: 10,
    deletions: 5,
    changed_files: 2,
    reviews: [],
    check_runs: [],
    comments_count: 0,
    commits_count: 1,
    repo_full_name: "org/repo",
    ...overrides,
  }
}

const ME = "reviewer-me"

describe("groupPullRequests", () => {
  it("coloca PR merged no grupo Mergeados", () => {
    const pr = makePR({ state: "closed", merged_at: new Date().toISOString() })
    const result = groupPullRequests([pr], ME)
    expect(result.merged.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR com minha aprovação e sem mudança nova no grupo Aprovados", () => {
    const approvedAt = new Date(Date.now() - 1000).toISOString()
    const pr = makePR({
      updated_at: new Date(Date.now() - 2000).toISOString(),
      reviews: [
        {
          id: 1,
          user: { login: ME, avatar_url: "" },
          state: "APPROVED",
          submitted_at: approvedAt,
        },
      ],
    })
    const result = groupPullRequests([pr], ME)
    expect(result.approved.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR stale no grupo Alerta", () => {
    const oldDate = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString()
    // PR grande (não se encaixa como Quick Win) e sem atividade por 8 dias
    const pr = makePR({
      updated_at: oldDate,
      comments_count: 0,
      commits_count: 1,
      changed_files: 10,
      additions: 200,
      deletions: 100,
    })
    const result = groupPullRequests([pr], ME)
    expect(result.stale.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR com review-requested no Inbox se não revisei ainda", () => {
    const pr = makePR({
      requested_reviewers: [{ login: ME, avatar_url: "" }],
      reviews: [],
    })
    const result = groupPullRequests([pr], ME)
    expect(result.inbox.map((p) => p.id)).toContain(pr.id)
  })

  it("coloca PR pequeno sem minha interação no Quick Wins", () => {
    const pr = makePR({
      changed_files: 3,
      additions: 20,
      deletions: 10,
      reviews: [],
      requested_reviewers: [],
    })
    const result = groupPullRequests([pr], ME)
    expect(result.quickWins.map((p) => p.id)).toContain(pr.id)
  })

  it("exclui PRs prontos para merge (aprovação de terceiros + CI verde)", () => {
    const pr = makePR({
      reviews: [
        {
          id: 1,
          user: { login: "other", avatar_url: "" },
          state: "APPROVED",
          submitted_at: new Date().toISOString(),
        },
      ],
      check_runs: [
        { id: 1, name: "ci", status: "completed", conclusion: "success" },
      ],
    })
    const result = groupPullRequests([pr], ME)
    const allGroupIds = [
      ...result.unlock,
      ...result.inbox,
      ...result.quickWins,
      ...result.stale,
      ...result.explore,
      ...result.approved,
      ...result.merged,
    ].map((p) => p.id)
    expect(allGroupIds).not.toContain(pr.id)
  })

  it("PR deve aparecer em apenas um grupo", () => {
    const pr = makePR({
      changed_files: 2,
      additions: 10,
      deletions: 5,
    })
    const result = groupPullRequests([pr], ME)
    const allGroupIds = [
      ...result.unlock,
      ...result.inbox,
      ...result.quickWins,
      ...result.stale,
      ...result.explore,
      ...result.approved,
      ...result.merged,
    ].map((p) => p.id)
    const uniqueIds = new Set(allGroupIds)
    expect(allGroupIds.length).toBe(uniqueIds.size)
  })
})
