"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { LogOut } from "lucide-react"

export default function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const getFirstName = (fullName) => {
    return fullName ? fullName.split(" ")[0] : ""
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
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
              <button className="header-btn" onClick={handleLogout} aria-label="Sair da conta">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
