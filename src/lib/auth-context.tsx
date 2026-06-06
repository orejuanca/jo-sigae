'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const PASSWORD = '3143'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const auth = sessionStorage.getItem('certificaciones_auth')
    if (auth === 'true') setIsAuthenticated(true)
    setLoading(false)
  }, [])

  const login = (password: string): boolean => {
    if (password === PASSWORD) {
      sessionStorage.setItem('certificaciones_auth', 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem('certificaciones_auth')
    setIsAuthenticated(false)
    router.push('/')
  }

  if (loading) return null

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
