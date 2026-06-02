"use client"

import { motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import Link from "next/link"

const EASE = [0.22, 1, 0.36, 1] as const

const product = [
  { href: "/analyze", label: "Analyze" },
  { href: "/master", label: "Master" },
  { href: "/pricing", label: "Pricing" },
] as const

const support = [
  { href: "/how-it-works", label: "Why Mastrify" },
  { href: "/help", label: "Contact" },
] as const

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const

type FooterLinkColumn = {
  title: string
  links: readonly { href: string; label: string }[]
}

const FOOTER_LINK_COLUMNS: FooterLinkColumn[] = [
  { title: "Product", links: product },
  { title: "Support", links: support },
  { title: "Legal", links: legal },
]

const FOOTER_LINKS_HEADING_CLASS =
  "text-[9px] font-medium uppercase tracking-[0.28em] text-label sm:text-[10px]"

function FooterLinksMobile({ columns }: { columns: FooterLinkColumn[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ Product: true })

  return (
    <nav aria-label="Footer navigation" className="footer-links-mobile w-full min-w-0 md:hidden">
      <div className="flex flex-col divide-y divide-white/[0.07]">
        {columns.map((column) => {
          const isOpen = Boolean(open[column.title])
          return (
            <div key={column.title} className="min-w-0 py-0">
              <button
                type="button"
                className="footer-accordion-trigger flex w-full min-h-[44px] items-center justify-between gap-3 py-1 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen((prev) => ({ ...prev, [column.title]: !prev[column.title] }))}
              >
                <span className={FOOTER_LINKS_HEADING_CLASS}>{column.title}</span>
                <span
                  className={`text-[10px] text-white/45 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </button>
              {isOpen ? (
                <ul className="m-0 flex list-none flex-col items-start gap-1 pb-2 pl-0">
                  {column.links.map((link) => (
                    <li key={link.href} className="w-full">
                      <Link href={link.href} className="footer-tap-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

function FooterLinksDesktop({ columns }: { columns: FooterLinkColumn[] }) {
  const linkRowCount = Math.max(...columns.map((column) => column.links.length), 0)

  return (
    <nav
      aria-label="Footer navigation"
      className="footer-links-grid hidden w-full min-w-0 md:grid md:items-center"
      style={{
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
        columnGap: "clamp(2rem, 5vw, 4.5rem)",
        rowGap: "18px",
      }}
    >
      {columns.map((column) => (
        <h3
          key={`heading-${column.title}`}
          className={`m-0 whitespace-nowrap ${FOOTER_LINKS_HEADING_CLASS}`}
        >
          {column.title}
        </h3>
      ))}

      {Array.from({ length: linkRowCount }, (_, rowIndex) =>
        columns.map((column) => {
          const link = column.links[rowIndex]
          return (
            <div
              key={`${column.title}-row-${rowIndex}`}
              className="flex min-h-[2.5rem] items-center justify-start"
            >
              {link ? (
                <Link href={link.href} className="footer-tap-link whitespace-nowrap">
                  {link.label}
                </Link>
              ) : null}
            </div>
          )
        }),
      )}
    </nav>
  )
}

function FooterLinksSection() {
  return (
    <>
      <FooterLinksMobile columns={FOOTER_LINK_COLUMNS} />
      <FooterLinksDesktop columns={FOOTER_LINK_COLUMNS} />
    </>
  )
}

const socialLinks = [
  {
    href: "https://www.instagram.com/mastrify.app?igsh=YzNxNzg1Ynh5cmsx&utm_source=qr",
    label: "Mastrify on Instagram",
  },
  {
    href: "https://www.tiktok.com/@mastrify.app?_r=1&_t=ZN-96NwDmGznjK",
    label: "Mastrify on TikTok",
  },
] as const

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="footer-social-link flex h-9 w-9 items-center justify-center rounded-full border border-transparent active:scale-[0.96]"
    >
      {children}
    </a>
  )
}

export default function SiteFooter() {
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const onAnalyze = pathname === "/analyze"
  const footerTopClass = onAnalyze ? "max-md:pt-3 sm:pt-5 lg:pt-[1.5rem]" : "lg:pt-[1.5rem]"
  const year = new Date().getFullYear()

  return (
    <footer className={`site-overflow-guard relative mt-auto overflow-x-clip ${onAnalyze ? "max-md:-mt-1" : ""}`}>
      {onAnalyze ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 -top-10 h-16 bg-gradient-to-b from-transparent via-black/45 to-black/80 md:-top-14 md:h-20"
          aria-hidden
        />
      ) : null}

      <motion.div
        className={`footer-shell relative mx-auto w-full px-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-[430px]:px-5 sm:px-6 sm:pb-8 md:px-10 md:pt-7 md:pb-9 ${footerTopClass}`}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-48px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <motion.div className="footer-site-grid grid min-w-0 items-start gap-8 max-md:gap-6 max-md:justify-items-center max-md:text-center md:gap-10 lg:grid-cols-12 lg:gap-x-16 xl:gap-x-20 2xl:gap-x-24">
          <motion.div
            className="footer-brand min-w-0 max-md:mx-auto max-md:flex max-md:w-full max-md:max-w-[18.5rem] max-md:flex-col max-md:items-center max-md:text-center lg:col-span-4 xl:col-span-4"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Link href="/" className="inline-flex items-center justify-center max-md:w-full">
              <span className="text-[18px] font-semibold tracking-[-0.02em] text-white/92">Mastrify</span>
            </Link>
            <p className="footer-brand-copy mt-2.5 max-w-[18rem] text-[13.5px] leading-[1.55] text-muted max-md:mx-auto max-md:text-center md:text-left lg:max-w-[16rem] md:text-[14.5px] md:leading-[1.7] xl:max-w-[19rem]">
              Intelligent mastering for music that deserves its full emotional weight — release-ready, without the
              noise.
            </p>
          </motion.div>

          <motion.div
            className="min-w-0 w-full max-md:mx-auto max-md:max-w-[20.5rem] lg:col-span-8 lg:justify-self-end xl:col-span-8"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          >
            <FooterLinksSection />
          </motion.div>
        </motion.div>

        <motion.div
          className="footer-mobile-meta mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 max-md:mt-5 max-md:items-center max-md:gap-2 max-md:pt-4 md:mt-8 md:pt-6"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
        >
          <div className="footer-bottom-start flex w-full flex-col items-center gap-2 max-md:gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
            <p className="footer-copyright text-[11px] text-muted-soft max-md:text-center md:text-left">
              © {year} Mastrify
            </p>
            <div className="footer-social-row flex items-center justify-center gap-2.5 md:justify-end">
              <SocialLink href={socialLinks[0].href} label={socialLinks[0].label}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="3.5" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </SocialLink>
              <SocialLink href={socialLinks[1].href} label={socialLinks[1].label}>
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.69V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 011.14.23V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.14-5.1v-7a8.16 8.16 0 004.45 1.33V7.95a5.7 5.7 0 01-4-.26z" />
                </svg>
              </SocialLink>
            </div>
          </div>

          <p className="footer-lunov-credit w-full px-1 text-center text-[8px] font-normal uppercase leading-snug tracking-[0.2em] text-muted-faint sm:text-[9px] sm:tracking-[0.24em] md:px-0 md:text-left md:leading-relaxed md:tracking-[0.26em]">
            Designed &amp; engineered by{" "}
            <a
              href="https://lunov.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-label transition duration-300 hover:text-violet-200/78"
            >
              Lunov
            </a>
          </p>
        </motion.div>
      </motion.div>
    </footer>
  )
}
