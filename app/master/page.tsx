"use client"

import { useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import BrandLogo from "../components/BrandLogo"
import CinematicBackground from "../components/CinematicBackground"
import { useMasterSession } from "./MasterSessionProvider"

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, setFile } = useMasterSession()

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] text-white md:min-h-[calc(100vh-4rem)]">
      <CinematicBackground intensity="strong" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-28 pt-14 md:px-8 md:pt-20">
        <BrandLogo subtitle="AI MASTERING" className="mt-2" />

        <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
          <span className="text-white">1 · Upload</span>
          <span>→</span>
          <span>2 · Settings</span>
          <span>→</span>
          <span>3 · Master</span>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 max-w-md text-center text-sm leading-relaxed text-white/55 md:text-base"
        >
          Upload your mix for a release-ready master. Mastering is a{" "}
          <span className="text-white/80">premium</span> experience — instant preview, export when you are ready.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-12 w-full"
        >
          <div
            className="group relative w-full cursor-pointer overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.07] to-black/50 p-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_36px_96px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition hover:border-cyan-400/25 md:p-16"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) setFile(f)
            }}
            onClick={() => inputRef.current?.click()}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 opacity-0 transition group-hover:opacity-100" />
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
            />
            <div className="relative flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/30 to-cyan-500/20 ring-1 ring-white/10">
                <svg className="h-8 w-8 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">Drop your track</p>
                <p className="mt-1 text-sm text-white/45">WAV or MP3 • High resolution recommended</p>
              </div>
              <span className="rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_32px_rgba(139,92,246,0.22),0_4px_14px_rgba(0,0,0,0.35)]">
                Choose file
              </span>
            </div>
          </div>

          {file && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 truncate text-center text-xs text-cyan-300/80"
            >
              {file.name}
            </motion.p>
          )}

          <div className="mt-10 flex flex-col gap-3">
            <button
              type="button"
              disabled={!file}
              onClick={() => router.push("/master/settings")}
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 py-4 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Continue to settings
            </button>
            <p className="text-center text-[11px] text-white/35">
              Prefer the classic flow?{" "}
              <Link href="/flow" className="text-purple-300/90 underline-offset-2 hover:underline">
                Use one-page master
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
