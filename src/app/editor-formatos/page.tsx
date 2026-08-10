'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  FolderOpen, Trash2, Eye, Upload, Loader2, Plus, FileText,
} from 'lucide-react'

type PlanType = 'vigente' | 'derogado'

interface SavedLayout {
  id: string
  nombre: string
  plan: string
  createdAt: string
  updatedAt: string
}

export default function EditorFormatosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jo-sigae-current-plan')
      return stored === 'derogado' ? 'derogado' : 'vigente'
    }
    return 'vigente'
  })
  const [layouts, setLayouts] = useState<SavedLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const switchPlan = useCallback((newPlan: PlanType) => {
    setSelectedPlan(newPlan)
    localStorage.setItem('jo-sigae-current-plan', newPlan)
    window.dispatchEvent(new CustomEvent('plan-changed'))
  }, [])

  const loadLayouts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cert-layouts?plan=${selectedPlan}`)
      if (res.ok) {
        const data = await res.json()
        setLayouts(data)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los layouts.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [selectedPlan, toast])

  useEffect(() => { loadLayouts() }, [loadLayouts])

  const handleOpenInEditor = (id: string) => {
    localStorage.setItem('jo-sigae-current-plan', selectedPlan)
    router.push(`/certificaciones-visual?layout=${id}&plan=${selectedPlan}`)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/cert-layouts/${deleteId}?plan=${selectedPlan}`, { method: 'DELETE' })
      if (res.ok) {
        setLayouts(prev => prev.filter(l => l.id !== deleteId))
        toast({ title: 'Layout eliminado' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' })
    } finally {
      setDeleteId(null)
    }
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return d }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Editor de Formatos</h1>
            <p className="text-xs text-gray-400">Administra tus layouts de certificaciones guardados</p>
          </div>
          <Button
            size="sm"
            onClick={loadLayouts}
            variant="outline"
            className="text-xs h-8"
          >
            <Upload className="h-3 w-3 mr-1" /> Actualizar
          </Button>
        </div>

        {/* Plan Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Plan:</span>
          <div className="flex rounded-md overflow-hidden border border-gray-700">
            <button
              onClick={() => switchPlan('vigente')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                selectedPlan === 'vigente'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`
            }
            >
              Vigente
            </button>
            <button
              onClick={() => switchPlan('derogado')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                selectedPlan === 'derogado'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`
            >
              Derogado
            </button>
          </div>
          <Badge
            variant={selectedPlan === 'derogado' ? 'destructive' : 'default'}
            className="text-[10px]"
          >
            {layouts.length} layout{layouts.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Layouts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Cargando layouts...</span>
          </div>
        ) : layouts.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400 text-sm">
                No hay layouts guardados para plan <span className="font-semibold text-white">{selectedPlan}</span>.
              </p>
              <Button
                size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  localStorage.setItem('jo-sigae-current-plan', selectedPlan)
                  router.push(`/certificaciones-visual?plan=${selectedPlan}`)
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Crear nuevo layout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-1.5">
            {layouts.map(layout => (
              <div key={layout.id} className="flex items-center gap-3 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-2 transition-colors">
                <FileText className={`h-3.5 w-3.5 shrink-0 ${layout.plan === 'derogado' ? 'text-orange-400' : 'text-blue-400'}`} />
                <span className="flex-1 text-xs font-medium text-white truncate">{layout.nombre}</span>
                <Badge variant={layout.plan === 'derogado' ? 'destructive' : 'default'} className="text-[9px] px-1.5 py-0">
                  {layout.plan === 'derogado' ? 'DEROGADO' : 'VIGENTE'}
                </Badge>
                <span className="text-[10px] text-gray-500 hidden sm:inline">{formatDate(layout.updatedAt)}</span>
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-500"
                  onClick={() => handleOpenInEditor(layout.id)}
                >
                  <Eye className="h-3 w-3 mr-1" /> Abrir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 text-red-400 border-red-800 hover:bg-red-900/30 hover:text-red-300"
                  onClick={() => setDeleteId(layout.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Create new button at bottom */}
        {layouts.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                localStorage.setItem('jo-sigae-current-plan', selectedPlan)
                router.push(`/certificaciones-visual?plan=${selectedPlan}`)
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Crear nuevo layout en el editor
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Layout</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este layout? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}