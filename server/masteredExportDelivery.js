import { getSupabaseServiceClient, isSupabaseStorageConfigured } from "./supabaseStorage.js"

function normalizeEmail(email) {
  const value = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!value) return ""
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

function expiryLabel(expiresAt) {
  if (!expiresAt) return "This secure link may expire after a limited period."
  const expires = new Date(expiresAt).getTime()
  const days = Math.max(1, Math.round((expires - Date.now()) / (1000 * 60 * 60 * 24)))
  return `This secure link remains active for ${days} day${days === 1 ? "" : "s"}.`
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

async function sendMasterReadyEmail({ email, playbackUrl, expiresAt }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { sent: false, reason: "resend_not_configured" }

  const from = process.env.MASTRIFY_EMAIL_FROM?.trim() || "Mastrify <masters@mastrify.com>"
  const subject = "Your master is ready"
  const expiresCopy = expiryLabel(expiresAt)
  const html = `
    <div style="margin:0;background:#050509;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 20px;">
      <div style="max-width:520px;margin:0 auto;border:1px solid rgba(255,255,255,0.1);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.36));padding:28px;">
        <p style="margin:0 0 10px;color:rgba(196,181,253,0.72);font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Mastrify</p>
        <h1 style="margin:0;color:#fff;font-size:24px;line-height:1.2;letter-spacing:-0.02em;">Your master is ready</h1>
        <p style="margin:14px 0 24px;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.65;">Download your mastered track whenever you are ready. ${expiresCopy}</p>
        <a href="${playbackUrl}" style="display:inline-block;border-radius:12px;background:linear-gradient(90deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 18px;">Download your mastered track</a>
        <p style="margin:24px 0 0;color:rgba(255,255,255,0.48);font-size:12px;line-height:1.6;">Playback link:<br><a href="${playbackUrl}" style="color:rgba(191,219,254,0.86);word-break:break-all;">${playbackUrl}</a></p>
      </div>
    </div>
  `
  const text = `Your master is ready\n\nDownload your mastered track:\n${playbackUrl}\n\n${expiresCopy}`

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
export async function deliverMasterExportEmail({ email, objectKey, playbackUrl, expiresAt }) {
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
    result.email = await sendMasterReadyEmail({ email: to, playbackUrl, expiresAt })
  } catch (err) {
    result.email = { sent: false, error: err?.message || String(err) }
    console.warn("[delivery] failed to send master email:", result.email.error)
  }

  return result
}
