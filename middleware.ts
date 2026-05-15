import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
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
    pathname === "/contact"
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/audio") ||
    pathname.startsWith("/og-image")
  ) {
    return NextResponse.next()
  }

  // 🚫 Allt annat → landing
  url.pathname = "/landing"
  return NextResponse.redirect(url)
}