export type HelpFaqItem = {
  id: string
  question: string
  answer: string
  keywords: string[]
  popular?: boolean
}

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    id: "what-is-lufs",
    question: "What is LUFS?",
    answer:
      "LUFS (Loudness Units relative to Full Scale) measures how loud your track feels over time — the standard streaming platforms use for level matching. Mastrify targets release-ready loudness for your chosen style so your master competes on playlists without sounding crushed.",
    keywords: ["lufs", "loudness", "streaming", "level", "volume"],
    popular: true,
  },
  {
    id: "stereo-width",
    question: "What does Stereo Width do?",
    answer:
      "Stereo Width adjusts how wide the mix feels left-to-right. Higher values can add space on synths and guitars; lower values keep the center focused for vocals and kick/bass. If your mix already has heavy stereo effects, use a subtle setting to avoid phasey lows.",
    keywords: ["stereo", "width", "phase", "wide", "mono"],
    popular: true,
  },
  {
    id: "warm-vs-balanced",
    question: "Difference between Warm and Balanced?",
    answer:
      "Balanced (Streaming) aims for modern, even loudness with clear mids — great for most pop, hip-hop, and electronic releases. Warm adds softer highs and fuller low-mids for a richer, less bright tone. Try A/B on your chorus: pick the style that keeps vocals forward and the low end controlled.",
    keywords: ["warm", "balanced", "stream", "style", "preset", "tone"],
    popular: true,
  },
  {
    id: "still-processing",
    question: "Why is my track still processing?",
    answer:
      "Mastering runs on our audio engine and usually finishes within a minute for typical song lengths. Longer files or high load can take a few minutes. Keep the tab open; if it exceeds ~10 minutes, refresh and check History — avoid starting duplicate jobs for the same upload.",
    keywords: ["processing", "loading", "stuck", "wait", "slow", "spinner"],
    popular: true,
  },
  {
    id: "download-master",
    question: "How do I download my master?",
    answer:
      "After preview sounds right, complete checkout on the result page. Your full-resolution export unlocks for download and email delivery. Use the same browser session where you mastered; exports link to your session ID for a limited time.",
    keywords: ["download", "export", "purchase", "pay", "file", "wav"],
    popular: true,
  },
  {
    id: "low-end-control",
    question: "What does Low End Control do?",
    answer:
      "Low End Control tames sub and bass buildup so the master stays punchy on club systems and earbuds alike. Increase it if the master feels boomy; decrease if the bass feels thin — always compare against your unmastered mix.",
    keywords: ["low end", "bass", "sub", "boom", "mud"],
  },
  {
    id: "clarity-presence",
    question: "What is Clarity / Presence?",
    answer:
      "This shapes upper mids and presence (vocals, snare, guitars). A touch more can help a dull mix cut through; too much can sound harsh. Use small moves and trust your A/B toggle on the result page.",
    keywords: ["clarity", "presence", "harsh", "vocal", "bright"],
  },
  {
    id: "preview-vs-full",
    question: "Preview vs full master — what’s the difference?",
    answer:
      "The preview is a compressed stream for fast A/B on the site. The paid export is your full-quality master file. Loudness and tone should match closely; if preview and export differ, contact support with your session ID.",
    keywords: ["preview", "mp3", "wav", "quality", "a/b"],
  },
  {
    id: "payment-issue",
    question: "Payment didn’t go through or export missing",
    answer:
      "Check your email (including spam) for the delivery link. Payments are tied to the session that created the master — use the same device/browser when possible. If you were charged without a download, open a ticket under Payment / account with your receipt email.",
    keywords: ["payment", "stripe", "charged", "receipt", "email"],
  },
  {
    id: "analyze-step",
    question: "Do I need Analyze before Master?",
    answer:
      "Analyze is optional but recommended: it surfaces LUFS, stereo balance, and suggestions before you commit settings. You can go straight to Master with your own targets, or carry Analyze results into the mastering flow.",
    keywords: ["analyze", "analysis", "upload", "flow"],
  },
]

export function searchHelpFaq(query: string): HelpFaqItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return HELP_FAQ_ITEMS.filter((item) => {
    const hay = [item.question, item.answer, ...item.keywords].join(" ").toLowerCase()
    return q.split(/\s+/).every((token) => hay.includes(token))
  })
}

export const POPULAR_HELP_FAQ = HELP_FAQ_ITEMS.filter((i) => i.popular)
