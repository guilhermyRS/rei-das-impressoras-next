"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "./supabase"
import bcrypt from "bcryptjs"

// Create auth context
const AuthContext = createContext()

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext)

// Generate token with expiration
const generateToken = () => {
  const tokenData = {
    value: Math.random().toString(36).substring(2) + Date.now().toString(36),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in milliseconds
  }
  return tokenData
}

// Check if token is valid
const isTokenValid = (tokenData) => {
  if (!tokenData || !tokenData.expiresAt) return false
  return new Date(tokenData.expiresAt) > new Date()
}

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10)
}

// Compare password with hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash)
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

          // Verify if token is still valid
          if (isTokenValid(auth.token)) {
            setUser(auth.user)

            // Update cookie for server-side authentication
            document.cookie = `auth=${JSON.stringify(auth)}; path=/; max-age=${60 * 60}; SameSite=Strict`
          } else {
            // Expired token, logout
            localStorage.removeItem("auth")
            document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
            setUser(null)
          }
        }
      } catch (error) {
        console.error("Error loading user:", error)
        localStorage.removeItem("auth")
        document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
      }

      setLoading(false)
    }

    loadUser()

    // Create an interval to check token validity every minute
    const checkTokenInterval = setInterval(() => {
      const storedAuth = localStorage.getItem("auth")

      if (storedAuth) {
        const auth = JSON.parse(storedAuth)

        if (!isTokenValid(auth.token)) {
          // Expired token, logout
          localStorage.removeItem("auth")
          document.cookie = "auth=; path=/; max-age=0; SameSite=Strict"
          setUser(null)
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(checkTokenInterval)
  }, [])

  // Register function
  const register = async (email, password, full_name) => {
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single()

      if (existingUser) {
        return { error: { message: "Email already registered" } }
      }

      // Hash password
      const password_hash = await hashPassword(password)

      // Insert new user
      const { data, error } = await supabase
        .from("users")
        .insert({ email, password_hash, full_name, role: 2 }) // Default role 2
        .select()
        .single()

      if (error) throw error

      // Generate token and store in authentication
      const token = generateToken()
      const auth = { user: data, token }

      // Store in localStorage
      localStorage.setItem("auth", JSON.stringify(auth))

      // Update cookie for server-side authentication
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
      const { data, error } = await supabase.from("users").select("*").eq("email", email).single()

      if (error || !data) {
        return { error: { message: "Invalid credentials" } }
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, data.password_hash)

      if (!isPasswordValid) {
        return { error: { message: "Invalid credentials" } }
      }

      // Generate token and store in authentication
      const token = generateToken()
      const auth = { user: data, token }

      // Store in localStorage
      localStorage.setItem("auth", JSON.stringify(auth))

      // Update cookie for server-side authentication
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

        // Generate new token
        const newToken = generateToken()
        const updatedAuth = { ...auth, token: newToken }

        // Update in localStorage
        localStorage.setItem("auth", JSON.stringify(updatedAuth))

        // Update cookie for server-side authentication
        document.cookie = `auth=${JSON.stringify(updatedAuth)}; path=/; max-age=${60 * 60}; SameSite=Strict`

        return true
      }

      return false
    } catch (error) {
      console.error("Error updating token:", error)
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
