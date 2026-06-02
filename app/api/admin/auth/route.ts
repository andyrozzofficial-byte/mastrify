import { NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, createAdminToken, getAdminSecret } from "../../../../lib/admin"
import { ADMIN_ROLE_COOKIE, defaultAdminRole } from "../../../../lib/adminRoles"

export async function POST(request: Request) {
  try {
    console.log("[admin-auth-password-exists]", !!process.env.MASTRIFY_ADMIN_PASSWORD)
    console.log("[admin-auth-secret-exists]", !!process.env.MASTRIFY_ADMIN_SECRET)

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

    // Token must be signed with the same secret used for verification.
    // If `MASTRIFY_ADMIN_SECRET` is set, we verify against it (not the password).
    const token = await createAdminToken(getAdminSecret())
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
    const err = error as { message?: string; stack?: string }
    console.error("[admin-auth-full-error]", error)
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? err?.stack ?? null : null,
      },
      { status: 500 },
    )
  }
}
