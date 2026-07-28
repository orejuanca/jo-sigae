'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const PASSWORD = '3143'
const STORAGE_KEY = 'certificaciones_auth'

interface AuthContextType {
  isAuthenticated: boolean
  login: (password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
})

function safeGetSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // storage unavailable (private browsing, iframe, etc.)
  }
}

function safeRemoveSession(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const auth = safeGetSession(STORAGE_KEY)
    if (auth === 'true') setIsAuthenticated(true)
    setLoading(false)
  }, [])

  const login = useCallback((password: string): boolean => {
    if (password === PASSWORD) {
      safeSetSession(STORAGE_KEY, 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    safeRemoveSession(STORAGE_KEY)
    setIsAuthenticated(false)
    router.push('/')
  }, [router])

  if (loading) return null

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
