import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  ACCESS_COOKIE_NAME,
  getAccessSecret,
  isAccessBypassPath,
  isAccessGateEnabled,
  isProtectedPath,
  safeAccessRedirect,
  verifyAccessToken,
} from "./lib/access"

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

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

  if (isAccessGateEnabled()) {
    const hasAccess = await verifyAccessToken(
      request.cookies.get(ACCESS_COOKIE_NAME)?.value,
      getAccessSecret(),
    )

    if (isAccessBypassPath(pathname)) {
      if (pathname === "/access" && hasAccess) {
        const next = safeAccessRedirect(url.searchParams.get("next"))
        url.pathname = next
        url.search = ""
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    if (isProtectedPath(pathname) && !hasAccess) {
      url.pathname = "/access"
      url.search = ""
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
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
    pathname === "/access"
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/audio") ||
    pathname.startsWith("/og-image") ||
    pathname.startsWith("/api/access")
  ) {
    return NextResponse.next()
  }

  // 🚫 Allt annat → landing
  url.pathname = "/landing"
  return NextResponse.redirect(url)
}
