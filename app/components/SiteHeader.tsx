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
  "safari-nav-link stable-interaction inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,color] duration-200 hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-white sm:min-h-[44px] sm:px-5 sm:py-2.5 sm:text-[12px] md:min-h-0 md:rounded-lg md:px-4 md:py-2 md:text-[13px]"

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
      className={`site-overflow-guard glass-header sticky top-0 z-[100] pt-[max(0px,env(safe-area-inset-top))] transition-[background-color,box-shadow,border-color] duration-200 ease-out ${
        scrolled
          ? "glass-header-scrolled border-b border-white/[0.11] shadow-[0_1px_0_rgba(255,255,255,0.07),0_8px_28px_rgba(0,0,0,0.45)]"
          : "border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_16px_rgba(0,0,0,0.24)]"
      }`}
    >
      <div className="mx-auto w-full max-w-[1240px] min-w-0">
        <div className="flex h-[50px] min-w-0 items-center justify-between gap-2 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] min-[430px]:px-[max(0.875rem,env(safe-area-inset-left))] min-[430px]:pr-[max(0.875rem,env(safe-area-inset-right))] sm:h-12 sm:gap-3 sm:px-4 md:hidden">
          <Link
            href="/"
            prefetch={false}
            className="safari-nav-link min-w-0 shrink bg-gradient-to-r from-white via-purple-200 to-violet-200/85 bg-clip-text text-[1.02rem] font-extrabold tracking-tight text-transparent sm:text-lg"
          >
            Mastrify
          </Link>

          <Link href="/master" prefetch={false} className={`${navCtaClass} shrink-0`}>
            Start
          </Link>
        </div>

        <nav
          className="flex min-w-0 items-center justify-between gap-0.5 overflow-hidden border-t border-white/[0.06] px-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))] py-2 min-[430px]:px-[max(0.5rem,env(safe-area-inset-left))] min-[430px]:pr-[max(0.5rem,env(safe-area-inset-right))] sm:gap-1.5 sm:px-4 sm:py-2.5 md:hidden"
          aria-label="Main"
        >
          {links.map(({ href, label, short }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`safari-nav-link relative flex min-h-[38px] min-w-0 flex-1 items-center justify-center rounded-lg px-1.5 py-2 text-[11px] font-medium tracking-wide transition-[background-color,color] duration-200 min-[430px]:px-2 sm:min-h-[40px] sm:px-3.5 sm:text-[12px] ${
                  active
                    ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06]"
                    : "text-white/62 hover:bg-white/[0.04] hover:text-white/88"
                }`}
              >
                <span>{short}</span>
              </Link>
            )
          })}
        </nav>

        <div className="hidden h-[58px] min-w-0 items-center justify-between gap-6 px-8 md:flex">
          <Link
            href="/"
            prefetch={false}
            className="safari-nav-link min-w-0 shrink bg-gradient-to-r from-white via-purple-200 to-violet-200/85 bg-clip-text text-[1.02rem] font-extrabold tracking-tight text-transparent sm:text-lg md:text-xl"
          >
            Mastrify
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-6 lg:gap-8">
            <nav className="flex min-w-0 items-center gap-5 lg:gap-7" aria-label="Main">
              {links.map(({ href, label }) => {
                const active = pathname === href || pathname?.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    className={`safari-nav-link relative inline-flex h-9 items-center text-[13px] font-medium leading-none tracking-wide transition-colors duration-200 hover:text-white/88 ${
                      active ? "text-white" : "text-white/62"
                    }`}
                  >
                    {label}
                    {active && (
                      <span className="pointer-events-none absolute bottom-0 left-1/2 h-[2px] w-[calc(100%+8px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-purple-400/80 to-transparent shadow-[0_0_6px_rgba(192,132,252,0.18)]" />
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="relative z-[2] flex shrink-0 items-center">
              <Link href="/master" prefetch={false} className={navCtaClass}>
                Start mastering
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
