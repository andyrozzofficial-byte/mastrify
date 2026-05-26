import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isAccessBypassPath, safeAccessRedirect } from "./lib/access"
import { BETA_USER_EMAIL_COOKIE } from "./lib/betaAccess"
import { BETA_SESSION_COOKIE, hasValidBetaSessionCookie } from "./lib/betaSession"

function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

/** Admin UI, admin API, and beta-feedback API — must never hit the /landing catch-all below. */
function isAdminOrFeedbackApiBypass(pathname: string): boolean {
  const path = normalizePathname(pathname)
  return (
    path === "/login" ||
    path.startsWith("/admin") ||
    path.startsWith("/api/admin") ||
    path === "/api/beta-feedback" ||
    path === "/api/beta/profile" ||
    path === "/api/beta/profile/resume" ||
    path.startsWith("/api/beta/session/") ||
    path === "/api/beta-feedback/quick"
  )
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Admin + beta-feedback: pass through immediately (auth/roles enforced in AdminShell + /api/admin/*).
  if (isAdminOrFeedbackApiBypass(pathname)) {
    return NextResponse.next()
  }

  // 🔥 SKIP AUDIO FILES (DETTA ÄR FIXEN)
  if (pathname.startsWith("/audio")) {
    return NextResponse.next()
  }

  // 🔓 DEV MODE
  if (url.searchParams.get("dev") === "true") {
    return NextResponse.next()
  }

  // 🔓 Flow bypass
  if (url.searchParams.get("from") === "flow") {
    return NextResponse.next()
  }

  const betaEmailCookie = request.cookies.get(BETA_USER_EMAIL_COOKIE)?.value
  const betaSessionCookie = request.cookies.get(BETA_SESSION_COOKIE)?.value
  const hasBetaSession = await hasValidBetaSessionCookie(betaSessionCookie, betaEmailCookie)

  if (isAccessBypassPath(pathname)) {
    if (pathname === "/access" && hasBetaSession) {
      try {
        const profileUrl = new URL("/api/beta/profile", request.url)
        const profileRes = await fetch(profileUrl, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        })
        const profileJson = (await profileRes.json().catch(() => null)) as { complete?: boolean } | null
        if (profileJson?.complete) {
          const next = safeAccessRedirect(url.searchParams.get("next"))
          url.pathname = next
          url.search = ""
          return NextResponse.redirect(url)
        }
      } catch {
        /* fall through to access page */
      }
    }
    return NextResponse.next()
  }

  // ✅ Tillåt sidor
  if (
    pathname === "/" ||
    pathname.startsWith("/flow") ||
    pathname.startsWith("/analyze") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/pro") ||
    pathname === "/app" ||
    pathname === "/landing" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/blog") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/contact" ||
    pathname === "/help" ||
    pathname === "/access" ||
    pathname === "/login" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname === "/api/beta-feedback" ||
    pathname === "/api/beta/profile" ||
    pathname === "/api/beta/profile/resume" ||
    pathname.startsWith("/api/beta/session/")
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/audio") ||
    pathname.startsWith("/og-image") ||
    pathname.startsWith("/api/access") ||
    pathname.startsWith("/api/admin") ||
    pathname === "/api/beta-feedback" ||
    pathname.startsWith("/api/beta-feedback/") ||
    pathname === "/api/beta/profile" ||
    pathname === "/api/beta/profile/resume" ||
    pathname.startsWith("/api/beta/session/") ||
    pathname === "/api/support/tickets"
  ) {
    return NextResponse.next()
  }

  // 🚫 Allt annat → landing (only redirect to /landing in this codebase)
  url.pathname = "/landing"
  return NextResponse.redirect(url)
}
