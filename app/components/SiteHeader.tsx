"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/history", label: "Projects" },
]

export default function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 md:h-16 md:px-8">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-transparent bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text md:text-lg"
        >
          Mastrify
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition md:px-4 md:text-sm ${
                  active
                    ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10"
                    : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
