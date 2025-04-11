"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import PrintCenter from "@/components/PrintCenter"
import { useAuth } from "@/lib/auth"

export default function PrintCenterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, router, loading])

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "100vh" }}>
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!user) return null

  return <PrintCenter />
}
