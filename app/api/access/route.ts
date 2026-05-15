import { NextResponse } from "next/server"
import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  getAccessSecret,
  isAccessGateEnabled,
} from "../../../lib/access"

export async function POST(request: Request) {
  if (!isAccessGateEnabled()) {
    return NextResponse.json({ ok: true, disabled: true })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const submitted = typeof body.password === "string" ? body.password : ""
  const expected = process.env.MASTRIFY_ACCESS_PASSWORD ?? ""

  if (!submitted || submitted !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const token = await createAccessToken(getAccessSecret())
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
  return response
}
