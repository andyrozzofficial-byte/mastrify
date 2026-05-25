import { NextResponse } from "next/server"
import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  getAdminPassword,
  getAdminSecret,
  isAdminGateEnabled,
} from "../../../../lib/admin"

export async function POST(request: Request) {
  if (!isAdminGateEnabled()) {
    return NextResponse.json(
      { error: "Admin access is not configured. Set MASTRIFY_ADMIN_PASSWORD." },
      { status: 503 },
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const submitted = typeof body.password === "string" ? body.password : ""
  const expected = getAdminPassword()

  if (!submitted || submitted !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const token = await createAdminToken(getAdminSecret())
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })
  return response
}
