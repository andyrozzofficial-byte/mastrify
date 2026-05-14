/** Static blog shell — nav matches marketing; posts can be wired later */
export default function BlogPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-black px-6 py-20 text-white md:min-h-[calc(100vh-4rem)] md:px-10 md:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-purple-300/80">Mastrify</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Blog</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/50">Articles and product updates are on the way.</p>
      </div>
    </div>
  )
}
