import type { SupportTicketCategory } from "./supportTypes"

export const SUPPORT_SELF_HELP: Record<SupportTicketCategory, string[]> = {
  master_quality: [
    "Compare original vs master",
    "Try another mastering style (Balanced / Warm)",
    "Reduce Stereo Width if the mix feels too wide",
    "Re-render and compare",
  ],
  processing: [
    "Refresh the page",
    "Check History",
    "Avoid starting duplicate jobs",
    "Wait a few minutes for long files",
  ],
  payment: [
    "Check your spam folder",
    "Verify payment confirmation email",
    "Use the same browser/device session as checkout",
  ],
  bug: [
    "Note the exact page and steps before the bug",
    "Try a private/incognito window once",
    "Search help articles for similar issues",
  ],
  other: [
    "Search help articles above",
    "Include your session ID if you were mastering",
  ],
}
