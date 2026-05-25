import { NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, createAdminToken } from "../../../../lib/admin"
import { ADMIN_ROLE_COOKIE, defaultAdminRole } from "../../../../lib/adminRoles"

export async function POST(request: Request) {
  console.log("[admin-auth]", !!process.env.MASTRIFY_ADMIN_PASSWORD)

  try {
    const adminPassword = process.env.MASTRIFY_ADMIN_PASSWORD?.trim() ?? ""
    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: "MASTRIFY_ADMIN_PASSWORD missing" },
        { status: 500 },
      )
    }

    let body: { password?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
    }

    const submitted = typeof body.password === "string" ? body.password.trim() : ""
    if (!submitted || submitted !== adminPassword) {
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 })
    }

    const token = await createAdminToken(adminPassword)
    const response = NextResponse.json({ success: true, ok: true })
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    })
    response.cookies.set(ADMIN_ROLE_COOKIE, defaultAdminRole(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    })
    return response
  } catch (error: unknown) {
    console.error("[admin-auth]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message || "Unknown error" }, { status: 500 })
  }
}
