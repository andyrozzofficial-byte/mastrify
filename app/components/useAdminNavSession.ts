"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchAdminSessionClient } from "../../lib/adminSessionClient"

export function useAdminNavSession(initialAuthenticated = false) {
  const [isAdmin, setIsAdmin] = useState(initialAuthenticated)

  const refresh = useCallback(async () => {
    const session = await fetchAdminSessionClient()
    setIsAdmin(session.authenticated)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refresh])

  return { isAdmin, refresh }
}
