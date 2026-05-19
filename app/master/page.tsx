"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import ProductFlowPageShell from "../components/product/ProductFlowPageShell"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, setFile } = useMasterSession()

  return (
    <ProductFlowPageShell showBottomFade>
      <MasterUploadHero
        file={file}
        fileInputRef={inputRef}
        onFileSelected={setFile}
        onContinue={() => router.push("/master/settings")}
      />
    </ProductFlowPageShell>
  )
}
