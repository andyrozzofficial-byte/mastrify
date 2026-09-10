import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { fetchCustomerProfile, updateCustomerProfile } from "../../../../../lib/adminData"

type Params = { params: Promise<{ email: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/customers")
  if (auth.error) return auth.error

  const { email } = await params
  const decoded = decodeURIComponent(email)
  const profile = await fetchCustomerProfile(decoded)
  if ("error" in profile) {
    return NextResponse.json({ error: profile.error }, { status: 404 })
  }
  return NextResponse.json({ profile })
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/customers")
  if (auth.error) return auth.error

  const { email } = await params
  const decoded = decodeURIComponent(email)

  let body: { notes?: string | null; purchased?: boolean; name?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const result = await updateCustomerProfile(decoded, body)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
