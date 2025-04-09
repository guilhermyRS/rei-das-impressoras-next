"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/Dashboard"
import { useAuth } from "@/lib/auth"

export default function DashboardPage() {
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

  return <Dashboard />
}
