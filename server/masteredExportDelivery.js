import { getSupabaseServiceClient, isSupabaseStorageConfigured } from "./supabaseStorage.js"

function normalizeEmail(email) {
  const value = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!value) return ""
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

function expiryLabel(expiresAt) {
  if (!expiresAt) return "Your secure download link remains active for 7 days."
  const expires = new Date(expiresAt).getTime()
  const days = Math.max(1, Math.round((expires - Date.now()) / (1000 * 60 * 60 * 24)))
  return `Your secure download link remains active for ${days} day${days === 1 ? "" : "s"}.`
}

async function storeMasteredExport({ email, objectKey, expiresAt }) {
  if (!isSupabaseStorageConfigured()) return { stored: false, reason: "supabase_not_configured" }

  const createdAt = new Date().toISOString()
  const { error } = await getSupabaseServiceClient()
    .from("mastered_exports")
    .insert({
      email,
      object_key: objectKey,
      created_at: createdAt,
      expires_at: expiresAt,
    })

  if (error) throw new Error(`mastered_exports insert failed: ${error.message}`)
  return { stored: true, createdAt }
}

function cleanTrackTitle(trackTitle) {
  const value = typeof trackTitle === "string" ? trackTitle.trim() : ""
  return value.replace(/\s+/g, " ").slice(0, 120)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

async function sendMasterReadyEmail({ email, playbackUrl, expiresAt, trackTitle }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { sent: false, reason: "resend_not_configured" }

  const from = process.env.MASTRIFY_EMAIL_FROM?.trim() || "Mastrify <masters@mastrify.com>"
  const subject = "Your master is ready"
  const expiresCopy = expiryLabel(expiresAt)
  const title = cleanTrackTitle(trackTitle)
  const titleHtml = title
    ? `<p style="margin:14px 0 0;color:rgba(255,255,255,0.52);font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(title)}</p>`
    : ""
  const html = `
    <div style="margin:0;background:#030308;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:36px 20px;">
      <div style="max-width:540px;margin:0 auto;border:1px solid rgba(255,255,255,0.11);border-radius:24px;background:radial-gradient(circle at 12% 0%,rgba(124,58,237,0.24),transparent 38%),radial-gradient(circle at 88% 8%,rgba(37,99,235,0.18),transparent 34%),linear-gradient(180deg,rgba(255,255,255,0.075),rgba(5,5,12,0.94));box-shadow:0 24px 80px rgba(0,0,0,0.44);padding:34px 30px;text-align:left;">
        <p style="margin:0 0 12px;color:rgba(196,181,253,0.74);font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;">Mastrify</p>
        <h1 style="margin:0;color:#fff;font-size:28px;line-height:1.15;letter-spacing:-0.035em;">Your master is ready</h1>
        ${titleHtml}
        <p style="margin:18px 0 26px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.7;">Your mastered track is ready to download. ${expiresCopy}</p>
        <a href="${playbackUrl}" style="display:inline-block;border-radius:999px;background:linear-gradient(90deg,#8b5cf6,#2563eb);color:#fff;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:-0.01em;padding:15px 22px;box-shadow:0 14px 34px rgba(79,70,229,0.28);">Download your mastered track</a>
        <p style="margin:18px 0 0;color:rgba(255,255,255,0.46);font-size:12px;line-height:1.65;">Your secure download link remains active for 7 days.</p>
        <div style="height:1px;margin:28px 0 18px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.13),transparent);"></div>
        <p style="margin:0;color:rgba(255,255,255,0.36);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">Delivered by Mastrify</p>
      </div>
    </div>
  `
  const text = `Your master is ready${title ? `\n${title}` : ""}\n\nUse the “Download your mastered track” button in this email.\n\nYour secure download link remains active for 7 days.\n\nDelivered by Mastrify`

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject,
      html,
      text,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Resend failed (${res.status}): ${detail}`)
  }

  const data = await res.json().catch(() => null)
  return { sent: true, id: data?.id ?? null }
}

/**
 * Best-effort delivery: never block a successful master response if DB/email fails.
 */
export async function deliverMasterExportEmail({ email, objectKey, playbackUrl, expiresAt, trackTitle }) {
  const to = normalizeEmail(email)
  if (!to) return { requested: false }
  if (!objectKey || !playbackUrl) return { requested: true, delivered: false, reason: "missing_export_link" }

  const result = { requested: true, email: to, objectKey, expiresAt }

  try {
    result.storage = await storeMasteredExport({ email: to, objectKey, expiresAt })
  } catch (err) {
    result.storage = { stored: false, error: err?.message || String(err) }
    console.warn("[delivery] failed to store mastered export:", result.storage.error)
  }

  try {
    result.email = await sendMasterReadyEmail({ email: to, playbackUrl, expiresAt, trackTitle })
  } catch (err) {
    result.email = { sent: false, error: err?.message || String(err) }
    console.warn("[delivery] failed to send master email:", result.email.error)
  }

  return result
}
