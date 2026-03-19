"use client"

import { useInView } from "../hooks/useInView"

export default function FadeIn({ children, delay = 0 }: any) {
  const { ref, isVisible } = useInView()

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-700 transform
      ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
      `}
    >
      {children}
    </div>
  )
}