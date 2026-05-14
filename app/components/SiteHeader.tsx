"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/history", label: "History" },
]

export default function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.07] bg-black/50 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-3 px-5 md:h-[68px] md:gap-8 md:px-10">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-transparent md:text-xl bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text drop-shadow-[0_0_22px_rgba(139,92,246,0.35)]"
        >
          Mastrify
        </Link>

        <nav className="flex flex-1 justify-center">
          <div className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:gap-1">
            {links.map(({ href, label }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-full px-3 py-2 text-[11px] font-semibold transition sm:px-5 sm:text-[13px] ${
                    active ? "text-white" : "text-white/45 hover:text-white/85"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/35 via-purple-500/15 to-cyan-500/25 shadow-[0_0_20px_rgba(139,92,246,0.25)] ring-1 ring-white/15" />
                  )}
                  <span className="relative">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <Link
          href="/pricing"
          className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/90 transition hover:border-cyan-400/30 hover:bg-white/[0.09] hover:shadow-[0_0_20px_rgba(34,211,238,0.12)] sm:px-4 sm:text-sm"
        >
          Sign up
        </Link>
      </div>
    </header>
  )
}
