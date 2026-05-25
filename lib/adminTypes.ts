import type { BetaFeedbackPayload } from "./betaFeedbackTypes"

export const ADMIN_FEEDBACK_STATUSES = ["new", "read", "resolved"] as const
export type AdminFeedbackStatus = (typeof ADMIN_FEEDBACK_STATUSES)[number]

export const ADMIN_SUPPORT_STATUSES = [
  "open",
  "waiting_for_customer",
  "resolved",
  "closed",
] as const
export type AdminSupportStatus = (typeof ADMIN_SUPPORT_STATUSES)[number]

export const ADMIN_SUPPORT_PRIORITIES = ["low", "medium", "high"] as const
export type AdminSupportPriority = (typeof ADMIN_SUPPORT_PRIORITIES)[number]

export const ADMIN_JOB_STATUSES = ["processing", "complete", "failed"] as const
export type AdminJobStatus = (typeof ADMIN_JOB_STATUSES)[number]

export function isAdminFeedbackStatus(v: string): v is AdminFeedbackStatus {
  return (ADMIN_FEEDBACK_STATUSES as readonly string[]).includes(v)
}

export function isAdminSupportStatus(v: string): v is AdminSupportStatus {
  return (ADMIN_SUPPORT_STATUSES as readonly string[]).includes(v)
}

export function isAdminSupportPriority(v: string): v is AdminSupportPriority {
  return (ADMIN_SUPPORT_PRIORITIES as readonly string[]).includes(v)
}

export function isAdminJobStatus(v: string): v is AdminJobStatus {
  return (ADMIN_JOB_STATUSES as readonly string[]).includes(v)
}

export type AdminKpis = {
  uploadsToday: number
  mastersCompletedToday: number
  paidDownloadsToday: number
  revenueToday: number
  conversionRate: number | null
  activeUsers: number
  failedJobs: number
}

export type AdminNavBadges = {
  feedback: number
  support: number
}

export type AdminActivityItem = {
  id: string
  type: "master" | "purchase" | "feedback" | "support"
  title: string
  subtitle: string | null
  /** Secondary lines shown under the title (e.g. track name, processing time, LUFS). */
  details?: string[]
  created_at: string
  href: string | null
}

export type AdminOverview = AdminKpis & {
  feedbackTotal: number
  feedbackNew: number
  supportTotal: number
  supportOpen: number
  avgRecommendScore: number | null
  badges: AdminNavBadges
  recentFeedback: { id: string; created_at: string; track_name: string | null; status: AdminFeedbackStatus }[]
  recentSupport: { id: string; created_at: string; email: string; subject: string | null; status: AdminSupportStatus; priority: AdminSupportPriority }[]
  recentMasters: {
    id: string
    created_at: string
    track_name: string | null
    mastering_style: string | null
    status: AdminJobStatus
  }[]
  recentPurchases: { id: string; created_at: string; email: string; track_title: string | null; amount: number }[]
  recentActivity: AdminActivityItem[]
}

export type AdminFeedbackRow = {
  id: string
  created_at: string
  updated_at: string
  status: AdminFeedbackStatus
  session_id: string | null
  track_name: string | null
  track_duration: number | null
  mastering_style: string | null
  contact_email: string | null
  contact_discord: string | null
  recommend_score: number
  use_again_score: number
  ease_rating: number
  genre: string
  role: string
  release_ready: string
  admin_notes: string | null
  processing_time_ms: number | null
  master_lufs: number | null
  stereo_width: number | null
  low_end: number | null
  /** Full survey JSON from beta_master_feedback.responses */
  survey: BetaFeedbackPayload
  feedback_stage: "analysis" | "preview" | "completed"
}

export type AdminSupportRow = {
  id: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  email: string
  name: string | null
  subject: string | null
  message: string
  status: AdminSupportStatus
  priority: AdminSupportPriority
  source: string
  admin_notes: string | null
}

export type AdminCustomerRow = {
  email: string
  name: string | null
  feedbackCount: number
  supportCount: number
  exportCount: number
  purchased: boolean
  lastActivity: string
  lastTrack: string | null
  avgRecommend: number | null
}

export type AdminCustomerProfile = {
  email: string
  name: string | null
  notes: string | null
  purchased: boolean
  totalTracksMastered: number
  exportCount: number
  lastActivity: string | null
  feedback: AdminFeedbackRow[]
  support: AdminSupportRow[]
  sessions: string[]
}

export type AdminJobRow = {
  id: string
  created_at: string
  updated_at: string
  session_id: string | null
  track_name: string | null
  user_email: string | null
  status: AdminJobStatus
  processing_time_ms: number | null
  master_lufs: number | null
  mastering_style: string | null
  error_log: string | null
  source: string
}

export type AdminAnalyticsExtended = {
  funnel: { step: string; count: number }[]
  avgLufs: number | null
  topStyle: { style: string; count: number } | null
  avgProcessingMs: number | null
  dropOffStep: string | null
  dailyTrend: { date: string; uploads: number; masters: number; downloads: number }[]
  weeklyTrend: { week: string; uploads: number; masters: number; downloads: number }[]
  genreDistribution: { label: string; count: number }[]
  recommendOverTime: { date: string; avgRecommend: number; count: number }[]
}
