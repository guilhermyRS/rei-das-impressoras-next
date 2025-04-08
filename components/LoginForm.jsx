"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"

export default function LoginForm() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const { login } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await login(credentials.email, credentials.password)

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      // Adicionar cookie para autenticação do lado do servidor também
      // Isso vai funcionar com o middleware.js
      const auth = JSON.parse(localStorage.getItem("auth"))
      document.cookie = `auth=${JSON.stringify(auth)}; path=/; max-age=${60 * 60}; SameSite=Strict`

      router.push("/dashboard")
    }
  }

  return (
    <div className="auth-container">
      <h2 className="auth-title">Acesso ao Sistema</h2>

      {error && <div className="status-message status-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={credentials.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            name="password"
            className="form-control"
            value={credentials.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="auth-footer">
        Não tem conta? <Link href="/register">Cadastre-se</Link>
      </div>
    </div>
  )
}
