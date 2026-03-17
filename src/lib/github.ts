import type {
  CheckRun,
  EnrichedPR,
  GitHubUser,
  PullRequest,
  PullRequestAuthor,
  Review,
} from "@/lib/github.types"

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
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    )
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
): Promise<Array<PullRequest>> {
  return githubFetch<Array<PullRequest>>(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`,
    token
  )
}

export async function fetchPRReviews(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Array<Review>> {
  return githubFetch<Array<Review>>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    token
  )
}

async function fetchPRDetail(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{
  head_sha: string
  additions: number
  deletions: number
  changed_files: number
  comments_count: number
}> {
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
): Promise<Array<CheckRun>> {
  const result = await githubFetch<{ check_runs: Array<CheckRun> }>(
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
    fetchCheckRuns(token, owner, repo, details.head_sha).catch(
      () => [] as Array<CheckRun>
    ),
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
  repos: Array<string> // formato "owner/repo"
): Promise<Array<EnrichedPR>> {
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

export async function fetchUserRepos(token: string): Promise<Array<RepoSuggestion>> {
  return githubFetch<Array<RepoSuggestion>>(
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    token
  )
}

export async function searchRepos(
  token: string,
  query: string
): Promise<Array<RepoSuggestion>> {
  const result = await githubFetch<{ items: Array<RepoSuggestion> }>(
    `/search/repositories?q=${encodeURIComponent(query)}+in:name&per_page=10&sort=updated`,
    token
  )
  return result.items
}

type SearchIssueItem = {
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  draft?: boolean
  created_at: string
  updated_at: string
  user: PullRequestAuthor
  repository_url: string
  pull_request?: { merged_at: string | null }
}

export async function fetchMyOpenPRs(
  token: string,
  login: string
): Promise<Array<EnrichedPR>> {
  const result = await githubFetch<{ items: Array<SearchIssueItem> }>(
    `/search/issues?q=is:pr+is:open+author:${login}&per_page=100`,
    token
  )

  return Promise.all(
    result.items.map((item) => {
      // repository_url format: https://api.github.com/repos/{owner}/{repo}
      const repoPath = item.repository_url.replace(`${BASE_URL}/repos/`, "")
      const [owner, repo] = repoPath.split("/")

      const pr: PullRequest = {
        id: item.number,
        number: item.number,
        title: item.title,
        html_url: item.html_url,
        state: item.state,
        draft: item.draft ?? false,
        merged_at: item.pull_request?.merged_at ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user: item.user,
        requested_reviewers: [],
        additions: 0,
        deletions: 0,
        changed_files: 0,
      }

      return enrichPR(token, owner, repo, pr)
    })
  )
}
