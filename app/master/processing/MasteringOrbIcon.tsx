"use client"

import { motion } from "framer-motion"

/** Premium mastering orb — waveform lens + energy rings (not EQ bars). */
export default function MasteringOrbIcon({ className }: { className?: string }) {
  return (
    <motion.div
      className={`relative h-[4.75rem] w-[4.75rem] md:h-[5.25rem] md:w-[5.25rem] ${className ?? ""}`}
      aria-hidden
    >
      <motion.div
        className="pointer-events-none absolute inset-[-28%] rounded-full bg-violet-500/20 blur-2xl"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 80 80"
        fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <linearGradient id="procRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="34" stroke="url(#procRing)" strokeWidth="0.75" opacity="0.45" />
        <path
          d="M40 6 A34 34 0 0 1 72 32"
          stroke="url(#procRing)"
          strokeWidth="2.25"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M72 48 A34 34 0 0 1 40 74"
          stroke="url(#procRing)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.45"
        />
      </motion.svg>
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 80 80"
        fill="none"
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="40"
          cy="40"
          r="26"
          stroke="rgba(167,139,250,0.22)"
          strokeWidth="1"
          strokeDasharray="4 10"
        />
      </motion.svg>
      <svg className="absolute inset-[18%] h-[64%] w-[64%]" viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="procWave" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#e9d5ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <motion.path
          d="M6 24 C12 14, 18 34, 24 24 S36 14, 42 24"
          stroke="url(#procWave)"
          strokeWidth="2.25"
          strokeLinecap="round"
          animate={{ opacity: [0.72, 1, 0.72] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M6 28 C14 20, 22 32, 30 26 S38 20, 42 28"
          stroke="url(#procWave)"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.45"
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
        />
      </svg>
      <motion.div
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-100 via-white to-sky-200 shadow-[0_0_18px_rgba(167,139,250,0.65)]"
        animate={{ scale: [1, 1.18, 1], opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-violet-300/25"
        animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
    </motion.div>
  )
}
