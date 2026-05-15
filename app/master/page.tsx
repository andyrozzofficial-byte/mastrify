"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

const EASE = [0.22, 1, 0.36, 1] as const

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, setFile } = useMasterSession()
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="relative min-h-screen text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-violet-950/[0.08] to-transparent"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div className="page-container page-hero-pad relative pb-10 sm:pb-14 md:pb-20">
        <MasterUploadHero
          file={file}
          fileInputRef={inputRef}
          onFileSelected={setFile}
          onContinue={() => router.push("/master/settings")}
        />
      </motion.div>
    </motion.div>
  )
}
