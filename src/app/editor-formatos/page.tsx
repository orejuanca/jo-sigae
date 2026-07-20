'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import {
  FolderOpen, Trash2, Eye, Upload, Loader2, Plus, FileText,
  Clock, CalendarDays,
} from 'lucide-react'

interface SavedLayout {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
}

export default function EditorFormatosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const plan = useCurrentPlan()
  const [layouts, setLayouts] = useState<SavedLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadLayouts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cert-layouts?plan=${plan}`)
      if (res.ok) {
        const data = await res.json()
        setLayouts(data)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los layouts.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLayouts() }, [])

  const handleOpenInEditor = (id: string) => {
    router.push(`/certificaciones-visual?layout=${id}&plan=${plan}`)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/cert-layouts/${deleteId}?plan=${plan}`, { method: 'DELETE' })
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
              <p className="text-gray-400 text-sm">No hay layouts guardados.</p>
              <Button
                size="sm"
                className="mt-4 text-xs"
                onClick={() => router.push('/certificaciones-visual')}
              >
                <Plus className="h-3 w-3 mr-1" /> Crear nuevo layout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {layouts.map(layout => (
              <Card key={layout.id} className="bg-gray-800 border-gray-700 hover:border-gray-500 transition-colors">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                      <CardTitle className="text-sm font-semibold text-white truncate">
                        {layout.nombre}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex items-center gap-4 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Creado: {formatDate(layout.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Modificado: {formatDate(layout.updatedAt)}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-500"
                      onClick={() => handleOpenInEditor(layout.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-400 border-red-800 hover:bg-red-900/30 hover:text-red-300"
                      onClick={() => setDeleteId(layout.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
              onClick={() => router.push('/certificaciones-visual')}
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