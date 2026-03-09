export type GitHubUser = {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export type PullRequestAuthor = {
  login: string
  avatar_url: string
}

export type ReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "PENDING"

export type Review = {
  id: number
  user: PullRequestAuthor
  state: ReviewState
  submitted_at: string
}

export type CheckConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | null

export type CheckRun = {
  id: number
  name: string
  status: "queued" | "in_progress" | "completed"
  conclusion: CheckConclusion
}

export type PullRequest = {
  id: number
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  draft: boolean
  merged_at: string | null
  created_at: string
  updated_at: string
  user: PullRequestAuthor
  requested_reviewers: Array<PullRequestAuthor>
  additions: number
  deletions: number
  changed_files: number
  // Campos enriquecidos que buscamos separadamente
  reviews?: Array<Review>
  check_runs?: Array<CheckRun>
  comments_count?: number
  commits_count?: number
  repo_full_name?: string
}

export type EnrichedPR = Required<PullRequest> & {
  repo_full_name: string
}
