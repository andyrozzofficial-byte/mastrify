import { getSupabaseServiceClient, isSupabaseStorageConfigured } from "./supabaseStorage.js"

function normalizeEmail(email) {
  const value = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!value) return ""
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

const EXPIRY_COPY = "Your secure download link remains active for 7 days."

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
  const title = cleanTrackTitle(trackTitle)
  const escapedTitle = escapeHtml(title)
  const heading = title ? `Your master of '${escapedTitle}' is ready` : "Your master is ready"
  const subject = title ? `Your master of '${title}' is ready` : "Your master is ready"
  const previewCta = playbackUrl
    ? `
                        <tr>
                          <td align="center" style="padding:12px 0 0;">
                            <a class="secondary-cta" href="${playbackUrl}" style="display:inline-block;border:1px solid rgba(255,255,255,0.16);border-radius:999px;color:rgba(255,255,255,0.78);font-size:13px;font-weight:700;letter-spacing:-0.01em;line-height:20px;padding:12px 20px;text-decoration:none;">Preview your master</a>
                          </td>
                        </tr>`
    : ""
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          @media screen and (max-width: 480px) {
            .email-shell { padding: 24px 14px !important; }
            .email-card { padding: 28px 20px !important; border-radius: 22px !important; }
            .email-heading { font-size: 25px !important; line-height: 1.18 !important; }
            .email-copy { font-size: 15px !important; line-height: 1.75 !important; }
            .primary-cta { display:block !important; padding: 17px 22px !important; min-height: 22px !important; text-align:center !important; }
            .secondary-cta { display:block !important; text-align:center !important; }
          }
          .primary-cta:hover { box-shadow: 0 16px 38px rgba(99,102,241,0.34) !important; filter: brightness(1.05); }
        </style>
      </head>
      <body style="margin:0;background:#030308;color:#f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#030308;margin:0;padding:0;">
          <tr>
            <td class="email-shell" align="center" style="padding:38px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
                <tr>
                  <td class="email-card" style="border:1px solid rgba(255,255,255,0.11);border-radius:26px;background:#080811;background-image:radial-gradient(circle at 14% 0%,rgba(124,58,237,0.24),transparent 38%),radial-gradient(circle at 88% 6%,rgba(37,99,235,0.18),transparent 34%),linear-gradient(180deg,rgba(255,255,255,0.075),rgba(5,5,12,0.96));box-shadow:0 24px 78px rgba(0,0,0,0.46);padding:36px 32px;text-align:left;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 22px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="42" height="42" valign="middle" style="width:42px;height:42px;border-radius:15px;background:#111122;background-image:radial-gradient(circle at 32% 22%,rgba(139,92,246,0.92),rgba(37,99,235,0.48) 54%,rgba(3,7,18,0.96) 100%);box-shadow:0 0 28px rgba(99,102,241,0.22);">
                                <div style="width:42px;height:42px;border-radius:15px;border:1px solid rgba(255,255,255,0.13);">
                                  <div style="padding:14px 8px 0;">
                                    <div style="height:3px;border-radius:999px;background:linear-gradient(90deg,#ffffff,#c4b5fd,#7dd3fc);"></div>
                                    <div style="height:2px;margin-top:5px;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,0.42),rgba(147,197,253,0.72));"></div>
                                  </div>
                                </div>
                              </td>
                              <td valign="middle" style="padding-left:12px;">
                                <table role="presentation" width="120" cellspacing="0" cellpadding="0" border="0" style="opacity:0.48;">
                                  <tr>
                                    <td valign="bottom" style="width:6px;height:16px;padding-right:4px;"><div style="height:5px;background:#8b5cf6;border-radius:6px;"></div></td>
                                    <td valign="bottom" style="width:6px;height:16px;padding-right:4px;"><div style="height:10px;background:#6366f1;border-radius:6px;"></div></td>
                                    <td valign="bottom" style="width:6px;height:16px;padding-right:4px;"><div style="height:15px;background:#3b82f6;border-radius:6px;"></div></td>
                                    <td valign="bottom" style="width:6px;height:16px;padding-right:4px;"><div style="height:8px;background:#8b5cf6;border-radius:6px;"></div></td>
                                    <td valign="bottom" style="width:6px;height:16px;padding-right:4px;"><div style="height:13px;background:#6366f1;border-radius:6px;"></div></td>
                                    <td valign="bottom" style="width:6px;height:16px;"><div style="height:6px;background:#3b82f6;border-radius:6px;"></div></td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0 0 12px;color:rgba(196,181,253,0.76);font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;">Master ready</p>
                          <h1 class="email-heading" style="margin:0;color:#ffffff;font-size:29px;line-height:1.14;letter-spacing:-0.035em;font-weight:800;overflow-wrap:break-word;word-break:break-word;">${heading}</h1>
                          <p class="email-copy" style="margin:18px 0 26px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.72;">Your mastered track is ready to download. ${EXPIRY_COPY}</p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0;">
                          <a class="primary-cta" href="${playbackUrl}" style="display:inline-block;border-radius:999px;background:#6d5dfc;background-image:linear-gradient(90deg,#8b5cf6,#2563eb);color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:-0.01em;line-height:20px;padding:16px 24px;box-shadow:0 12px 30px rgba(79,70,229,0.26);transition:box-shadow 180ms ease,filter 180ms ease;">Download your mastered track</a>
                        </td>
                      </tr>
                      ${previewCta}
                      <tr>
                        <td style="padding:30px 0 18px;">
                          <div style="height:1px;background:rgba(255,255,255,0.12);background-image:linear-gradient(90deg,transparent,rgba(255,255,255,0.13),transparent);line-height:1px;font-size:1px;">&nbsp;</div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0;color:rgba(255,255,255,0.38);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Powered by Mastrify Audio Engine</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
  const textHeading = title ? `Your master of '${title}' is ready` : "Your master is ready"
  const text = `${textHeading}\n\nUse the Download your mastered track button in this email.\n\n${EXPIRY_COPY}\n\nPowered by Mastrify Audio Engine`

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
