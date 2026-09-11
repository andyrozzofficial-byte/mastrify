function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase()
  if (!value) return ""
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

function isProductionEmailRequired(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
}

export async function sendSupportReplyEmail(input: {
  to: string
  subject: string | null
  message: string
  ticketId: string
}): Promise<{ sent: true; id: string | null } | { sent: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    if (isProductionEmailRequired()) {
      return { sent: false, error: "Email service not configured (RESEND_API_KEY)" }
    }
    return { sent: true, id: null }
  }

  const to = normalizeEmail(input.to)
  if (!to) return { sent: false, error: "Ticket has no valid customer email" }

  const from =
    process.env.MASTRIFY_SUPPORT_EMAIL_FROM?.trim() ||
    process.env.MASTRIFY_EMAIL_FROM?.trim() ||
    "Mastrify Support <support@mastrify.com>"
  const replyTo = process.env.MASTRIFY_EMAIL_REPLY_TO?.trim() || "support@mastrify.com"
  const ticketRef = input.ticketId.slice(0, 8)
  const topic = input.subject?.trim() || "Your Mastrify support request"
  const subject = `Re: ${topic}`
  const escapedMessage = escapeHtml(input.message.trim())
  const escapedTopic = escapeHtml(topic)

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;margin:0;padding:0;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;">
                <tr>
                  <td style="padding:28px 24px;text-align:left;">
                    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#18181b;">Mastrify Support</p>
                    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b;">Reply regarding: <strong>${escapedTopic}</strong></p>
                    <div style="margin:0 0 24px;padding:16px 18px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;font-size:15px;line-height:1.7;color:#18181b;white-space:pre-wrap;">${escapedMessage}</div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">You can reply directly to this email if you need to follow up.</p>
                    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">Ticket reference: ${ticketRef}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `Mastrify Support\n\nReply regarding: ${topic}\n\n${input.message.trim()}\n\nYou can reply directly to this email if you need to follow up.\n\nTicket reference: ${ticketRef}`

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    return { sent: false, error: `Failed to send email (${res.status}): ${detail}` }
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null
  return { sent: true, id: data?.id ?? null }
}
