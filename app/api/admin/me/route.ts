import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/me")
  if (auth.error) return auth.error
  return NextResponse.json({ authenticated: true, role: auth.role })
}
