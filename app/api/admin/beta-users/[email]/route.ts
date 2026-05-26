import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { isBetaUserRank } from "../../../../../lib/betaAccess"
import { getBetaInvitePayload } from "../../../../../lib/betaEngagement"
import { fetchBetaUserProfile, updateBetaProfileAdmin } from "../../../../../lib/betaUserData"

type Params = { params: Promise<{ email: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/beta-users")
  if (auth.error) return auth.error

  const { email } = await params
  const profile = await fetchBetaUserProfile(decodeURIComponent(email))
  if ("error" in profile) {
    return NextResponse.json({ error: profile.error }, { status: 500 })
  }
  return NextResponse.json({ profile })
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/beta-users")
  if (auth.error) return auth.error

  const { email } = await params
  const decoded = decodeURIComponent(email)

  let body: {
    action?: string
    notes?: string | null
    betaApproved?: boolean
    betaRank?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.action === "invite") {
    const origin = new URL(request.url).origin
    const invite = getBetaInvitePayload(origin)
    return NextResponse.json({ ok: true, invite })
  }

  const patch: Parameters<typeof updateBetaProfileAdmin>[1] = {}
  if (body.action === "approve") patch.betaApproved = true
  if (body.action === "promote_rank") patch.promoteRank = true
  if (body.notes !== undefined) patch.notes = body.notes
  if (body.betaApproved !== undefined) patch.betaApproved = body.betaApproved
  if (body.betaRank && isBetaUserRank(body.betaRank)) patch.betaRank = body.betaRank

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No changes requested" }, { status: 400 })
  }

  const result = await updateBetaProfileAdmin(decoded, patch)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, betaRank: result.betaRank })
}
