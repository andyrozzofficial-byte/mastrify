"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const links = [
  { href: "/analyze", label: "Analyze", short: "Analyze" },
  { href: "/master", label: "Master", short: "Master" },
  { href: "/how-it-works", label: "Why Mastrify", short: "Why" },
  { href: "/pricing", label: "Pricing", short: "Pricing" },
] as const

const navCtaClass =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition active:scale-[0.98] hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white sm:min-h-[44px] sm:px-5 sm:py-2.5 sm:text-[12px] md:min-h-0 md:rounded-lg md:px-4 md:py-2 md:text-[13px]"

export default function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`site-overflow-guard sticky top-0 z-[100] pt-[max(0px,env(safe-area-inset-top))] transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ease-out backdrop-blur-2xl backdrop-saturate-150 md:duration-200 ${
        scrolled
          ? "border-b border-white/[0.11] bg-black/82 shadow-[0_1px_0_rgba(255,255,255,0.07),0_12px_40px_rgba(0,0,0,0.5),0_4px_24px_rgba(0,0,0,0.35)] max-md:backdrop-blur-3xl"
          : "border-b border-white/[0.06] bg-black/58 shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_20px_rgba(0,0,0,0.28)]"
      }`}
    >
      <div className="mx-auto w-full max-w-[1240px] min-w-0">
        <div className="flex h-[50px] min-w-0 items-center justify-between gap-2 px-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] sm:h-12 sm:gap-3 sm:px-4 md:h-[58px] md:px-8">
          <Link
            href="/"
            className="min-w-0 shrink bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-[1.02rem] font-extrabold tracking-tight text-transparent sm:text-lg md:text-xl"
          >
            Mastrify
          </Link>

          <Link href="/master" className={`${navCtaClass} shrink-0 md:hidden`}>
            Start
          </Link>

          <div className="hidden shrink-0 items-center gap-3.5 md:flex">
            <Link href="/master" className="text-[13px] font-medium text-muted-soft transition hover:text-muted-strong">
              Log in
            </Link>
            <Link href="/master" className={navCtaClass}>
              Start mastering
            </Link>
          </div>
        </div>

        <nav
          className="flex min-w-0 items-center justify-between gap-0.5 overflow-hidden border-t border-white/[0.06] px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] py-2 sm:gap-1.5 sm:px-4 sm:py-2.5 md:justify-center md:gap-6 md:border-t-0 md:px-8 md:py-0 lg:gap-8"
          aria-label="Main"
        >
          {links.map(({ href, label, short }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex min-h-[38px] min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-2 text-[11px] font-medium tracking-wide transition active:scale-[0.98] sm:min-h-[40px] sm:px-3.5 sm:text-[12px] md:min-h-0 md:flex-none md:justify-start md:rounded-none md:bg-transparent md:px-0 md:py-0 md:pb-0.5 md:text-[13px] md:text-sm ${
                  active
                    ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06] md:bg-transparent md:shadow-none md:ring-0"
                    : "text-white/62 hover:bg-white/[0.04] hover:text-white/88 md:hover:bg-transparent"
                }`}
              >
                {active && (
                  <span className="pointer-events-none absolute -bottom-0.5 left-1/2 hidden h-[2px] w-[calc(100%+8px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_rgba(192,132,252,0.42)] md:block" />
                )}
                <span className="md:hidden">{short}</span>
                <span className="hidden md:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}