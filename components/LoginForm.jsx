"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Mail, Lock, LogIn } from "lucide-react"

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
      // Add cookie for server-side authentication
      // This will work with middleware.js
      const auth = JSON.parse(localStorage.getItem("auth"))
      document.cookie = `auth=${JSON.stringify(auth)}; path=/; max-age=${60 * 60}; SameSite=Strict`

      router.push("/dashboard")
    }
  }

  return (
    <div className="auth-container">
      <h2 className="auth-title">System Access</h2>

      {error && <div className="status-message status-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">
            <Mail size={16} className="inline mr-1" />
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={credentials.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            <Lock size={16} className="inline mr-1" />
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className="form-control"
            value={credentials.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner inline-block w-4 h-4 mr-2"></span>
              Logging in...
            </>
          ) : (
            <>
              <LogIn size={16} className="inline mr-1" />
              Login
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        Don't have an account? <Link href="/register">Sign up</Link>
      </div>
    </div>
  )
}
