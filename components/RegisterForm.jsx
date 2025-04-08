"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const { register } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      setLoading(false)
      return
    }

    const { error } = await register(formData.email, formData.password, formData.nome)

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
      <h2 className="auth-title">Criar Conta</h2>

      {error && <div className="status-message status-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome">Nome completo</label>
          <input
            type="text"
            id="nome"
            name="nome"
            className="form-control"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={formData.email}
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
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar senha</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            className="form-control"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>

      <div className="auth-footer">
        Já tem conta? <Link href="/login">Faça login</Link>
      </div>
    </div>
  )
}
