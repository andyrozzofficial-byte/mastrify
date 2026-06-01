import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isBetaFeedbackEnabled } from "../../../../lib/betaFeedbackFeature"
import { createBetaReportedIssue, uploadBetaIssueScreenshot } from "../../../../lib/betaIssues"
import { isBetaIssuePriority } from "../../../../lib/betaIssueTypes"
import { normalizeBetaEmail } from "../../../../lib/betaAccess"
import { resolveBetaEmailFromCookies } from "../../../../lib/betaSession"
import {
  fetchBetaProfilePanelForEmail,
} from "../../../../lib/betaUserData"

export async function POST(request: Request) {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta features disabled" }, { status: 404 })
  }

  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)

  const contentType = request.headers.get("content-type") ?? ""
  let incomingLog: Record<string, unknown> = { contentType }
  let actionId = ""
  let title = ""
  let description = ""
  let expectedResult = ""
  let priority = "medium"
  let bodyEmail = ""
  let screenshotFile: File | null = null

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    actionId = String(form.get("actionId") ?? "").trim()
    title = String(form.get("title") ?? "").trim()
    description = String(form.get("description") ?? "").trim()
    expectedResult = String(form.get("expectedResult") ?? "").trim()
    priority = String(form.get("priority") ?? "medium").trim()
    bodyEmail = String(form.get("email") ?? "").trim()
    const file = form.get("screenshot")
    if (file instanceof File && file.size > 0) screenshotFile = file
  } else {
    let body: {
      actionId?: string
      title?: string
      description?: string
      expectedResult?: string
      priority?: string
      email?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    actionId = typeof body.actionId === "string" ? body.actionId.trim() : ""
    title = typeof body.title === "string" ? body.title.trim() : ""
    description = typeof body.description === "string" ? body.description.trim() : ""
    expectedResult = typeof body.expectedResult === "string" ? body.expectedResult.trim() : ""
    priority = typeof body.priority === "string" ? body.priority.trim() : "medium"
    bodyEmail = typeof body.email === "string" ? body.email.trim() : ""
  }

  incomingLog = {
    actionId,
    title,
    descriptionLength: description.length,
    expectedResultLength: expectedResult.length,
    priority,
    email: bodyEmail || cookieEmail || undefined,
    hasScreenshot: Boolean(screenshotFile),
  }
  console.log("[issue-api] incoming", incomingLog)

  const email =
    cookieEmail ?? (bodyEmail.includes("@") ? normalizeBetaEmail(bodyEmail) : null)

  if (!email) {
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }
  if (!actionId) {
    return NextResponse.json({ error: "actionId required" }, { status: 400 })
  }
  if (!title || title.length < 3) {
    return NextResponse.json({ error: "Issue title is required" }, { status: 400 })
  }
  if (!description || description.length < 10) {
    return NextResponse.json({ error: "Please describe what happened (at least 10 characters)" }, { status: 400 })
  }
  if (!isBetaIssuePriority(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
  }

  let screenshotUrl: string | null = null
  if (screenshotFile) {
    screenshotUrl = await uploadBetaIssueScreenshot(email, actionId, screenshotFile)
  }

  const result = await createBetaReportedIssue({
    actionId,
    userId: email,
    title,
    description,
    expectedResult,
    screenshotUrl,
    priority,
  })

  console.log("[issue-api] result", result)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const panelResult = await fetchBetaProfilePanelForEmail(email)

  return NextResponse.json({
    ok: true,
    id: result.id,
    created: result.created,
    alreadyCounted: result.alreadyCounted,
    pointsAwarded: result.created ? 2 : 0,
    panel: "error" in panelResult ? null : panelResult.panel,
  })
}
