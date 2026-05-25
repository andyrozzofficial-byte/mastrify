/** Beta feedback is off unless explicitly enabled via env. */
function envFlagTrue(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes"
}

function envFlagFalse(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === "false" || v === "0" || v === "no"
}

/**
 * Gate all beta feedback UI, API calls, and session analytics.
 *
 * Production: set `ENABLE_BETA_FEEDBACK=true` on Vercel (next.config mirrors to
 * `NEXT_PUBLIC_ENABLE_BETA_FEEDBACK` at build time). You may also set
 * `NEXT_PUBLIC_ENABLE_BETA_FEEDBACK=true` directly.
 */
export function isBetaFeedbackEnabled(): boolean {
  const publicFlag = process.env.NEXT_PUBLIC_ENABLE_BETA_FEEDBACK
  const serverFlag = process.env.ENABLE_BETA_FEEDBACK

  if (envFlagFalse(publicFlag) || envFlagFalse(serverFlag)) return false

  return envFlagTrue(publicFlag) || envFlagTrue(serverFlag)
}
