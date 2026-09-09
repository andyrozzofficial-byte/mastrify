import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin | Mastrify",
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-white">Admin</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        Internal sign-in will be available here. This route is not linked from the public site.
      </p>
    </div>
  )
}
