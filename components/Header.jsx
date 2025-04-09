"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { useState } from "react"
import { LogOut, Settings, Layout, Users, HandshakeIcon } from "lucide-react"

export default function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const getFirstName = (fullName) => {
    return fullName ? fullName.split(" ")[0] : ""
  }

  const getInitials = (fullName) => {
    if (!fullName) return ""
    const names = fullName.split(" ")
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return names[0][0].toUpperCase()
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
    setIsDropdownOpen(false)
  }

  return (
    <header>
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link href={user ? "/dashboard" : "/login"}>Rei das Impressoras</Link>
          </div>

          {user && (
            <div className="user-info">
              <span>Olá, {getFirstName(user.nome)}</span>
              <div className="relative">
                <button
                  className="avatar-btn"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-label="Menu do usuário"
                >
                  <div className="avatar">{getInitials(user.nome)}</div>
                </button>
                
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <Link href="/dashboard" className="dropdown-item">
                      <Layout size={16} />
                      <span>Painel</span>
                    </Link>
                    <Link href="/configuracoes" className="dropdown-item">
                      <Settings size={16} />
                      <span>Configurações</span>
                    </Link>
                    <Link href="/sobre" className="dropdown-item">
                      <Users size={16} />
                      <span>Sobre nós</span>
                    </Link>
                    <Link href="/parceria" className="dropdown-item">
                      <HandshakeIcon size={16} />
                      <span>Parceria</span>
                    </Link>
                    <button onClick={handleLogout} className="dropdown-item">
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}