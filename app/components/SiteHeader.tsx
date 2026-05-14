"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
]

export default function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-black/55 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2.5 px-5 py-2.5 md:h-[58px] md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 md:py-0">
        <div className="flex items-center justify-between md:contents">
          <Link
            href="/"
            className="shrink-0 text-lg font-bold tracking-tight text-transparent md:text-xl bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text drop-shadow-[0_0_14px_rgba(139,92,246,0.22)]"
          >
            Mastrify
          </Link>
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/pricing"
              className="text-[13px] font-medium text-white/50 transition hover:text-white/90"
            >
              Log in
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_0_17px_rgba(124,58,237,0.28),0_8px_24px_rgba(0,0,0,0.35)] transition hover:brightness-110"
            >
              Sign up
            </Link>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 border-t border-white/[0.06] pt-3 md:flex-1 md:border-t-0 md:pt-0 lg:gap-x-8">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`relative pb-0.5 text-[13px] font-medium tracking-wide transition md:text-sm ${
                  active ? "text-white" : "text-white/45 hover:text-white/88"
                }`}
              >
                {active && (
                  <span className="pointer-events-none absolute -bottom-0.5 left-1/2 h-[2px] w-[calc(100%+8px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_rgba(192,132,252,0.42)]" />
                )}
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <Link
            href="/pricing"
            className="text-[13px] font-medium text-white/50 transition hover:text-white/90"
          >
            Log in
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.26),0_8px_28px_rgba(0,0,0,0.38)] transition hover:brightness-110"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  )
}
