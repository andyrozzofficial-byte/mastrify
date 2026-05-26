function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function sendBetaMagicLinkEmail({
  email,
  signInUrl,
}: {
  email: string
  signInUrl: string
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { sent: false, reason: "resend_not_configured" }

  const from = process.env.MASTRIFY_EMAIL_FROM?.trim() || "Mastrify <masters@mastrify.com>"
  const replyTo = process.env.MASTRIFY_EMAIL_REPLY_TO?.trim() || "support@mastrify.com"
  const escapedUrl = escapeHtml(signInUrl)
  const subject = "Continue your Mastrify beta session"
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="margin:0;background:#030308;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#030308;padding:36px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width:520px;border:1px solid rgba(255,255,255,0.11);border-radius:24px;background:#080811;padding:32px 28px;text-align:left;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;color:#fff;font-size:20px;font-weight:800;">Mastrify</p>
                    <h1 style="margin:0;color:#fff;font-size:26px;line-height:1.2;font-weight:800;">Welcome back</h1>
                    <p style="margin:18px 0 24px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.7;">
                      Tap the secure link below to continue your private beta session. No password needed — the link expires in 30 minutes.
                    </p>
                    <a href="${escapedUrl}" style="display:inline-block;border-radius:999px;background:linear-gradient(90deg,#8b5cf6,#2563eb);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;">
                      Continue to Mastrify
                    </a>
                    <p style="margin:24px 0 0;color:rgba(255,255,255,0.42);font-size:12px;line-height:1.6;">
                      If you did not request this email, you can ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
  const text = `Welcome back to Mastrify\n\nContinue your beta session (expires in 30 minutes):\n${signInUrl}\n\nIf you did not request this email, you can ignore it.`

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
      reply_to: replyTo,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    console.error("[beta-magic-link] resend failed", res.status, detail.slice(0, 200))
    return { sent: false, reason: "resend_failed" }
  }

  return { sent: true }
}
