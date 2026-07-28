'use client'

import dynamic from 'next/dynamic'
import { AppShell } from '@/components/app-shell'

const DashboardContent = dynamic(
  () => import('@/components/dashboard-content'),
  { 
    ssr: false,
    loading: () => (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-lg">Cargando dashboard...</div>
        </div>
      </AppShell>
    )
  }
)

export default function DashboardPage() {
  return <DashboardContent />
}
