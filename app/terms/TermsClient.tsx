"use client"

import LegalPageShell from "../components/legal/LegalPageShell"

const SECTIONS = [
  {
    title: "Your responsibilities",
    body: (
      <ul>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          You must own or control the rights to everything you upload.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Do not upload illegal, infringing, or unauthorized material.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          You are responsible for how you use exported masters on platforms and releases.
        </li>
      </ul>
    ),
  },
  {
    title: "The service",
    body: (
      <p>
        Mastrify provides digital mastering and analysis as an on-demand service. Results depend on your source material,
        settings, and technical constraints. We aim for release-ready quality but cannot guarantee a specific commercial
        outcome for every mix.
      </p>
    ),
  },
  {
    title: "Payments & delivery",
    body: (
      <ul>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Mastering is delivered as a digital product — previews and paid full exports.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Payment is for the export you unlock after your master has been generated.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          No refunds after a successful export has been delivered and made available for download.
        </li>
      </ul>
    ),
  },
  {
    title: "Storage & availability",
    body: (
      <ul>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Exported masters and preview files may be stored temporarily or permanently depending on current platform
          storage policies.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Signed playback and download links may expire after a certain period.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          You are responsible for downloading and backing up exported masters after delivery.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          We may remove inactive or expired files to maintain platform performance and storage capacity.
        </li>
        <li>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Mastrify does not guarantee permanent cloud storage unless we explicitly say so.
        </li>
      </ul>
    ),
  },
  {
    title: "Provided “as is”",
    narrow: true,
    body: (
      <p>
        The service is provided on an “as is” and “as available” basis. To the extent permitted by law, we disclaim
        warranties of merchantability, fitness for a particular purpose, and non-infringement. Our liability is limited
        to the amount you paid for the affected export in the preceding transaction.
      </p>
    ),
  },
  {
    title: "Changes",
    body: (
      <p>
        We may update these terms as the product evolves. Continued use after changes are posted constitutes acceptance
        of the revised terms.
      </p>
    ),
  },
] as const

export default function TermsClient() {
  return (
    <LegalPageShell
      label="Legal"
      title="Terms of Service"
      lead="The essentials for using Mastrify fairly, safely, and with confidence in what you are buying."
      sections={[...SECTIONS]}
    />
  )
}
