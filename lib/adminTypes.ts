export const ADMIN_ITEM_STATUSES = ["new", "read", "resolved"] as const
export type AdminItemStatus = (typeof ADMIN_ITEM_STATUSES)[number]

export function isAdminItemStatus(v: string): v is AdminItemStatus {
  return (ADMIN_ITEM_STATUSES as readonly string[]).includes(v)
}

export type AdminOverview = {
  feedbackTotal: number
  feedbackNew: number
  supportTotal: number
  supportNew: number
  avgRecommendScore: number | null
  recentFeedback: { id: string; created_at: string; track_name: string | null; status: AdminItemStatus }[]
  recentSupport: { id: string; created_at: string; email: string; subject: string | null; status: AdminItemStatus }[]
}

export type AdminFeedbackRow = {
  id: string
  created_at: string
  updated_at: string
  status: AdminItemStatus
  session_id: string | null
  track_name: string | null
  mastering_style: string | null
  contact_email: string | null
  contact_discord: string | null
  recommend_score: number
  use_again_score: number
  genre: string
  release_ready: string
  admin_notes: string | null
}

export type AdminSupportRow = {
  id: string
  created_at: string
  updated_at: string
  email: string
  name: string | null
  subject: string | null
  message: string
  status: AdminItemStatus
  source: string
  admin_notes: string | null
}

export type AdminCustomerRow = {
  email: string
  name: string | null
  feedbackCount: number
  supportCount: number
  lastActivity: string
  lastTrack: string | null
  avgRecommend: number | null
}
