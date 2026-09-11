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
          Files are used only to run the mix analysis or mastering you request.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          We do not sell, license, or distribute your audio to third parties.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Processing is limited to delivering previews, playback links, and exports back to you.
        </li>
      </ul>
    ),
  },
  {
    title: "Storage & retention",
    body: (
      <>
        <p>
          Uploads, generated masters, and preview files may be stored temporarily so we can complete your session and
          deliver results.
        </p>
        <p>
          Playback and download links — including links to preview your master — are available for{" "}
          <strong className="font-medium text-white/82">12 hours</strong> from when they are issued. After that window,
          links may expire and associated files may be deleted automatically.
        </p>
        <p>
          Mastrify is not long-term cloud storage. Keep your own backups of original mixes and final exports.
        </p>
      </>
    ),
  },
  {
    title: "Payments",
    body: (
      <p>
        When you pay for an export, payment is handled through Stripe and other secure payment providers. Mastrify does
        not store full card numbers on our servers. Billing applies to the specific master export you choose to unlock
        after your preview is ready.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        We use industry-standard practices to protect data in transit and at rest. No system is perfectly secure. If you
        believe your account or upload was compromised, contact us promptly through our support form.
      </p>
    ),
  },
] as const

export default function PrivacyClient() {
  return (
    <LegalPageShell
      label="Legal"
      title="Privacy Policy"
      lead="How Mastrify handles your audio, your data, and your trust — in plain language."
      sections={[...SECTIONS]}
    />
  )
}
