"use client"

import LegalPageShell from "../components/legal/LegalPageShell"

const SECTIONS = [
  {
    title: "Your music stays yours",
    body: (
      <p>
        You retain full ownership of every track you upload. Mastrify does not claim rights to your compositions,
        recordings, or masters. We provide analysis and mastering as a service on your material — nothing more.
      </p>
    ),
  },
  {
    title: "How we use uploads",
    body: (
      <ul>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Files are used only to run mix analysis and mastering you request.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          We do not sell, license, or distribute your audio to third parties.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Processing happens to deliver previews and exports back to you.
        </li>
      </ul>
    ),
  },
  {
    title: "Storage & retention",
    body: (
      <p>
        Uploads and generated masters may be stored temporarily to complete your session. Files can be automatically
        deleted after a limited retention period. Playback and download links may expire after a limited period for
        security and storage management. Do not rely on Mastrify as long-term storage — keep your own backups of original
        mixes and final exports.
      </p>
    ),
  },
  {
    title: "Payments",
    body: (
      <p>
        When you pay for an export, payment is handled through secure payment providers. Mastrify does not store full
        card numbers on our servers. Billing is tied to the master you choose to unlock after it has been generated.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        We use industry-standard practices to protect data in transit and at rest. No system is perfectly secure; if you
        believe your account or upload was compromised, contact us promptly.
      </p>
    ),
  },
] as const

export default function PrivacyClient() {
  return (
    <LegalPageShell
      label="Legal"
      title="Privacy Policy"
      lead="A clear summary of how Mastrify treats your audio, your data, and your trust."
      sections={[...SECTIONS]}
    />
  )
}
