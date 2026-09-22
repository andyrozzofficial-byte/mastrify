import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function isAdminBypass(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  )
}

const LINUS_EXACT_ROUTES = new Set([
  "/analyze",
  "/pricing",
  "/how-it-works",
  "/about",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
])

const MASTER_NEXTJS_PREFIXES = [
  "/master/download",
  "/master/result",
  "/master/settings",
  "/master/processing",
]

function isMasterNextJsRoute(pathname: string): boolean {
  return MASTER_NEXTJS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function linusRewriteTarget(pathname: string): string | null {
  const path = normalizePathname(pathname)

  if (path === "/") return "/linus/index.html"
  if (path === "/master") return "/linus/master/index.html"
  if (path.startsWith("/master/")) return null
  if (LINUS_EXACT_ROUTES.has(path)) return `/linus${path}/index.html`

  return null
}

function isLinusPublicAsset(pathname: string): boolean {
  if (pathname.startsWith("/assets/") || pathname.startsWith("/linus/")) {
    return true
  }

  if (
    pathname.startsWith("/mastrify") ||
    pathname === "/backend.js" ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/og-image.png" ||
    pathname.startsWith("/icon-")
  ) {
    return true
  }

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 1) {
    return /\.(css|js|png|ico|svg|webp|woff2?)$/i.test(pathname)
  }

  return false
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  if (isAdminBypass(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return NextResponse.next()
  }

  if (pathname.startsWith("/ai-mastering")) {
    return NextResponse.next()
  }

  if (isMasterNextJsRoute(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/audio")) {
    return NextResponse.next()
  }

  if (url.searchParams.get("dev") === "true") {
    return NextResponse.next()
  }

  if (url.searchParams.get("from") === "flow") {
    return NextResponse.next()
  }

  if (pathname === "/access" || pathname.startsWith("/access/")) {
    url.pathname = "/master"
    url.search = ""
    return NextResponse.redirect(url)
  }

  const linusTarget = linusRewriteTarget(pathname)
  if (linusTarget) {
    url.pathname = linusTarget
    return NextResponse.rewrite(url)
  }

  if (
    pathname.startsWith("/flow") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/pro") ||
    pathname === "/app" ||
    pathname === "/landing"
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/og-image") ||
    pathname.startsWith("/og-flow")
  ) {
    return NextResponse.next()
  }

  if (isLinusPublicAsset(pathname)) {
    return NextResponse.next()
  }

  url.pathname = "/landing"
  return NextResponse.redirect(url)
}
