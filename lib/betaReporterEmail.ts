import { normalizeBetaEmail } from "./betaAccess"

/** Client-side beta reporter email — cookie is applied server-side on API routes. */
export function getBetaReporterEmail(
  storedEmail?: string | null,
  deliveryEmail?: string | null,
): string {
  const stored = storedEmail?.trim() ?? ""
  if (stored.includes("@")) return normalizeBetaEmail(stored)
  const delivery = deliveryEmail?.trim() ?? ""
  if (delivery.includes("@")) return normalizeBetaEmail(delivery)
  return ""
}
