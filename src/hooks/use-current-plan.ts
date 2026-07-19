'use client'
import { useState, useEffect } from 'react'

export function useCurrentPlan() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jo-sigae-current-plan')
      return stored === 'derogado' ? 'derogado' : 'vigente'
    }
    return 'vigente'
  })

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem('jo-sigae-current-plan')
      setPlan(stored === 'derogado' ? 'derogado' : 'vigente')
    }
    window.addEventListener('plan-changed', handler)
    return () => window.removeEventListener('plan-changed', handler)
  }, [])

  return plan
}