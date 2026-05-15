"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/how-it-works", label: "Why Mastrify" },
  { href: "/pricing", label: "Pricing" },
] as const

const navCtaClass =
  "rounded-lg border border-white/[0.09] bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white md:px-4 md:py-2 md:text-[13px]"

const loginClass =
  "text-[12px] font-medium text-muted-soft transition hover:text-muted-strong md:text-[13px]"

export default function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-black/55 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2.5 px-5 py-2.5 md:h-[58px] md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 md:py-0">
        <div className="flex items-center justify-between md:contents">
          <Link
            href="/"
            className="shrink-0 bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent drop-shadow-[0_0_14px_rgba(139,92,246,0.22)] md:text-xl"
          >
            Mastrify
          </Link>
          <div className="flex items-center gap-3.5 md:hidden">
            <Link href="/pricing" className={loginClass}>
              Log in
            </Link>
            <Link href="/master" className={navCtaClass}>
              Start mastering
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
                  active ? "text-white" : "text-white/75 hover:text-white/88"
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

        <div className="hidden shrink-0 items-center gap-3.5 md:flex">
          <Link href="/pricing" className={loginClass}>
            Log in
          </Link>
          <Link href="/master" className={navCtaClass}>
            Start mastering
          </Link>
        </div>
      </div>
    </header>
  )
}
