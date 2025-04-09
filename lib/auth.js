"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "./supabase"

// Create auth context
const AuthContext = createContext()

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext)

// Generate token with expiration
const generateToken = () => {
  const tokenData = {
    value: Math.random().toString(36).substring(2) + Date.now().toString(36),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora em milissegundos
  }
  return tokenData
}

// Check if token is valid
const isTokenValid = (tokenData) => {
  if (!tokenData || !tokenData.expiresAt) return false
  return new Date(tokenData.expiresAt) > new Date()
}

// Auth provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user and check token on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedAuth = localStorage.getItem("auth")

        if (storedAuth) {
          const auth = JSON.parse(storedAuth)

          // Verificar se o token ainda é válido
          if (isTokenValid(auth.token)) {
            setUser(auth.user)

            // Atualizar cookie para autenticação do lado do servidor
            document.cookie = `auth=${JSON.stringify(auth)}; path=/; max-age=${60 * 60}; SameSite=Strict`
          } else {
            // Token expirado, fazer logout
            localStorage.removeItem("auth")
            document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
            setUser(null)
          }
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error)
        localStorage.removeItem("auth")
        document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
      }

      setLoading(false)
    }

    loadUser()

    // Criar um intervalo para verificar a validade do token a cada minuto
    const checkTokenInterval = setInterval(() => {
      const storedAuth = localStorage.getItem("auth")

      if (storedAuth) {
        const auth = JSON.parse(storedAuth)

        if (!isTokenValid(auth.token)) {
          // Token expirado, fazer logout
          localStorage.removeItem("auth")
          document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
          setUser(null)
        }
      }
    }, 60000) // Verificar a cada minuto

    return () => clearInterval(checkTokenInterval)
  }, [])

  // Register function
  const register = async (email, password, nome) => {
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase.from("usuarios").select("id").eq("email", email).single()

      if (existingUser) {
        return { error: { message: "Email já cadastrado" } }
      }

      // Insert new user
      const { data, error } = await supabase
        .from("usuarios")
        .insert({ email, senha: password, nome }) // Em produção, usar hash de senha
        .select()
        .single()

      if (error) throw error

      // Gerar token e armazenar na autenticação
      const token = generateToken()
      const auth = { user: data, token }

      // Armazenar no localStorage
      localStorage.setItem("auth", JSON.stringify(auth))

      // Atualizar cookie para autenticação do lado do servidor
      document.cookie = `auth=${JSON.stringify(auth)}; path=/; max-age=${60 * 60}; SameSite=Strict`

      setUser(data)

      return { user: data }
    } catch (error) {
      return { error }
    }
  }

  // Login function
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .eq("senha", password) // Em produção, implementar verificação adequada de senha
        .single()

      if (error || !data) {
        return { error: { message: "Credenciais inválidas" } }
      }

      // Gerar token e armazenar na autenticação
      const token = generateToken()
      const auth = { user: data, token }

      // Armazenar no localStorage
      localStorage.setItem("auth", JSON.stringify(auth))

      // Atualizar cookie para autenticação do lado do servidor
      document.cookie = `auth=${JSON.stringify(auth)}; path=/; max-age=${60 * 60}; SameSite=Strict`

      setUser(data)

      return { user: data }
    } catch (error) {
      return { error }
    }
  }

  // Refresh token function
  const refreshToken = () => {
    try {
      const storedAuth = localStorage.getItem("auth")

      if (storedAuth) {
        const auth = JSON.parse(storedAuth)

        // Gerar novo token
        const newToken = generateToken()
        const updatedAuth = { ...auth, token: newToken }

        // Atualizar no localStorage
        localStorage.setItem("auth", JSON.stringify(updatedAuth))

        // Atualizar cookie para autenticação do lado do servidor
        document.cookie = `auth=${JSON.stringify(updatedAuth)}; path=/; max-age=${60 * 60}; SameSite=Strict`

        return true
      }

      return false
    } catch (error) {
      console.error("Erro ao atualizar token:", error)
      return false
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem("auth")
    document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
    setUser(null)
  }

  // Verify if is authenticated
  const isAuthenticated = () => {
    try {
      const storedAuth = localStorage.getItem("auth")

      if (!storedAuth) return false

      const auth = JSON.parse(storedAuth)
      return isTokenValid(auth.token)
    } catch (error) {
      return false
    }
  }

  // Build context value
  const value = {
    user,
    register,
    login,
    logout,
    refreshToken,
    isAuthenticated,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
