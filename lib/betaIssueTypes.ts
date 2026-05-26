export const BETA_ISSUE_PRIORITIES = ["low", "medium", "high"] as const
export type BetaIssuePriority = (typeof BETA_ISSUE_PRIORITIES)[number]

export const BETA_ISSUE_STATUSES = ["open", "in_progress", "fixed", "closed"] as const
export type BetaIssueStatus = (typeof BETA_ISSUE_STATUSES)[number]

export const BETA_ISSUE_STATUS_LABELS: Record<BetaIssueStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed",
  closed: "Closed",
}

export const BETA_ISSUE_PRIORITY_LABELS: Record<BetaIssuePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

export function isBetaIssuePriority(v: string): v is BetaIssuePriority {
  return (BETA_ISSUE_PRIORITIES as readonly string[]).includes(v)
}

export function isBetaIssueStatus(v: string): v is BetaIssueStatus {
  return (BETA_ISSUE_STATUSES as readonly string[]).includes(v)
}

export type BetaReportedIssueRow = {
  id: string
  action_id: string
  user_id: string
  title: string
  description: string
  expected_result: string | null
  screenshot_url: string | null
  priority: BetaIssuePriority
  status: BetaIssueStatus
  created_at: string
  updated_at: string
}
