"use client"

import { motion, useReducedMotion } from "framer-motion"
import PremiumButton from "./PremiumButton"

const EASE = [0.22, 1, 0.36, 1] as const

export default function MarketingFinalCtaSection() {
  const reduce = useReducedMotion()

  return (
    <section
      className="marketing-final-cta relative z-10 border-t border-white/[0.06] bg-[#050508]"
      aria-labelledby="marketing-final-cta-heading"
    >
      <div className="page-container py-10 sm:py-11 md:py-12 lg:py-14">
        <motion.div
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/58">
            Release ready
          </p>
          <h2
            id="marketing-final-cta-heading"
            className="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.65rem] md:text-[1.75rem]"
          >
            Ready to master your track?
          </h2>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/68 md:text-[15px] md:leading-relaxed">
            Studio-grade loudness and tone — pay when your export is ready.
          </p>

          <div className="footer-cta-card site-final-cta-card mt-6 w-full max-w-md sm:mt-7 sm:max-w-lg">
            <div className="flex flex-col items-center px-1 py-1 text-center sm:px-2">
              <PremiumButton
                href="/master"
                gateMastering
                className="mt-0 min-h-[46px] w-full px-7 text-[13px] min-[430px]:w-auto min-[430px]:min-w-[13rem] min-[430px]:px-8"
              >
                Start mastering
              </PremiumButton>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
