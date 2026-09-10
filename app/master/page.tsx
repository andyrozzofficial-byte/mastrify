"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

const EASE = [0.22, 1, 0.36, 1] as const

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, setFile } = useMasterSession()
  return (
    <motion.div
      className="relative min-h-screen text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.04),transparent_55%)]"
        aria-hidden
      />

      <motion.div className="relative mx-auto w-full max-w-[1080px] px-5 pb-4 pt-6 md:px-10 md:pb-8 md:pt-8">
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
