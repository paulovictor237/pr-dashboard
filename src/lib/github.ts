import type { GitHubUser, PullRequest, Review, CheckRun, EnrichedPR } from "~/lib/github.types"

const BASE_URL = "https://api.github.com"

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export async function fetchCurrentUser(token: string): Promise<GitHubUser> {
  return githubFetch<GitHubUser>("/user", token)
}

export async function fetchPRsForRepo(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<PullRequest[]> {
  return githubFetch<PullRequest[]>(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`,
    token
  )
}

export async function fetchPRReviews(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Review[]> {
  return githubFetch<Review[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    token
  )
}

async function fetchPRDetail(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ head_sha: string; additions: number; deletions: number; changed_files: number; comments_count: number }> {
  const pr = await githubFetch<{
    head: { sha: string }
    additions: number
    deletions: number
    changed_files: number
    comments: number
    review_comments: number
  }>(`/repos/${owner}/${repo}/pulls/${prNumber}`, token)
  return {
    head_sha: pr.head.sha,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    comments_count: pr.comments + pr.review_comments,
  }
}

export async function fetchCheckRuns(
  token: string,
  owner: string,
  repo: string,
  sha: string
): Promise<CheckRun[]> {
  const result = await githubFetch<{ check_runs: CheckRun[] }>(
    `/repos/${owner}/${repo}/commits/${sha}/check-runs`,
    token
  )
  return result.check_runs
}

export async function enrichPR(
  token: string,
  owner: string,
  repo: string,
  pr: PullRequest
): Promise<EnrichedPR> {
  const details = await fetchPRDetail(token, owner, repo, pr.number)
  const [reviews, checkRuns] = await Promise.all([
    fetchPRReviews(token, owner, repo, pr.number),
    fetchCheckRuns(token, owner, repo, details.head_sha).catch(() => [] as CheckRun[]),
  ])

  return {
    ...pr,
    additions: details.additions,
    deletions: details.deletions,
    changed_files: details.changed_files,
    reviews,
    check_runs: checkRuns,
    comments_count: details.comments_count,
    commits_count: pr.commits_count ?? 0,
    repo_full_name: `${owner}/${repo}`,
  } as EnrichedPR
}

export async function fetchAllPRsForRepos(
  token: string,
  repos: string[] // formato "owner/repo"
): Promise<EnrichedPR[]> {
  const allEnriched = await Promise.all(
    repos.map(async (repoFullName) => {
      const [owner, repo] = repoFullName.split("/")
      const [openPRs, closedPRs] = await Promise.all([
        fetchPRsForRepo(token, owner, repo, "open"),
        fetchPRsForRepo(token, owner, repo, "closed").then((prs) =>
          prs.filter((p) => p.merged_at !== null).slice(0, 10)
        ),
      ])
      const prs = [...openPRs, ...closedPRs]
      return Promise.all(prs.map((pr) => enrichPR(token, owner, repo, pr)))
    })
  )
  return allEnriched.flat()
}

export type RepoSuggestion = {
  full_name: string
  description: string | null
  private: boolean
}

export async function fetchUserRepos(token: string): Promise<RepoSuggestion[]> {
  return githubFetch<RepoSuggestion[]>(
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    token
  )
}

export async function searchRepos(token: string, query: string): Promise<RepoSuggestion[]> {
  const result = await githubFetch<{ items: RepoSuggestion[] }>(
    `/search/repositories?q=${encodeURIComponent(query)}+in:name&per_page=10&sort=updated`,
    token
  )
  return result.items
}
