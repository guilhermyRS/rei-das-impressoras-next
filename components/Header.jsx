"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [timeRemaining, setTimeRemaining] = useState("")

  // Calcular tempo restante de sessão
  useEffect(() => {
    if (!user) return

    const calculateTimeRemaining = () => {
      try {
        const storedAuth = localStorage.getItem("auth")
        if (!storedAuth) return ""

        const auth = JSON.parse(storedAuth)
        const expiresAt = new Date(auth.token.expiresAt)
        const now = new Date()

        if (expiresAt <= now) {
          return "Sessão expirada"
        }

        const diffMs = expiresAt - now
        const diffMins = Math.floor(diffMs / 60000)
        const diffSecs = Math.floor((diffMs % 60000) / 1000)

        return `${diffMins}m ${diffSecs}s`
      } catch (error) {
        return ""
      }
    }

    // Atualizar tempo restante a cada segundo
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [user])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getFirstName = (fullName) => {
    return fullName ? fullName.split(' ')[0] : ''
  }

  return (
    <header>
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link href={user ? "/dashboard" : "/login"}>Rei das Impresoras</Link>
          </div>

          {user && (
            <div className="user-info">
              <span>Olá, {getFirstName(user.nome)}</span>
              {timeRemaining && <span className="session-timer">{timeRemaining}</span>}
              <button className="btn btn-primary header-btn" onClick={handleLogout}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}