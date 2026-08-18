'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { SheetEditor } from '@/components/dashboard-content'

type PlanType = 'vigente' | 'derogado'

export default function EditorDashboardPage() {
  const [plan, setPlan] = useState<PlanType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('plan') === 'derogado' ? 'derogado' : 'vigente'
    }
    return 'vigente'
  })

  const handleSwitch = () => {
    const newPlan = plan === 'vigente' ? 'derogado' : 'vigente'
    setPlan(newPlan)
    window.history.replaceState(null, '', `/editor-formatos/dashboard?plan=${newPlan}`)
  }

  return (
    <AppShell>
      <SheetEditor key={plan} plan={plan} onSwitchPlan={handleSwitch} />
    </AppShell>
  )
}
