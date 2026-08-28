'use client'

import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { SheetEditor } from '@/components/dashboard-content'

type PlanType = 'vigente' | 'derogado'

export default function EditorDashboardPage() {
  const searchParams = useSearchParams()
  const plan: PlanType = searchParams.get('plan') === 'derogado' ? 'derogado' : 'vigente'

  const handleSwitch = () => {
    const newPlan = plan === 'vigente' ? 'derogado' : 'vigente'
    window.history.replaceState(null, '', `/editor-formatos/dashboard?plan=${newPlan}`)
    window.location.reload()
  }

  return (
    <AppShell>
      <SheetEditor key={plan} plan={plan} onSwitchPlan={handleSwitch} />
    </AppShell>
  )
}
