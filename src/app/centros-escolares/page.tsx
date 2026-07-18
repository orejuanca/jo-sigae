'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, Loader2, Pencil, Trash2, School } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CentroEscolar {
  id: string
  codigo: string
  nombre: string
  localidad: string
  estado: string
  municipio: string
  activo: boolean
}

export default function CentrosEscolaresPage() {
  const [centros, setCentros] = useState<CentroEscolar[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 50

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CentroEscolar | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formCodigo, setFormCodigo] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [formLocalidad, setFormLocalidad] = useState('')
  const [formEstado, setFormEstado] = useState('')
  const [formMunicipio, setFormMunicipio] = useState('')

  const { toast } = useToast()

  const fetchCentros = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/centros-escolares?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${limit}`)
      const data = await res.json()
      setCentros(data.centros || [])
      setTotal(data.total || 0)
    } catch {
      toast({ title: 'Error', description: 'Error al cargar centros escolares', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCentros() }, [searchQuery, page])

  // Auto-crear tabla si no existe
  useEffect(() => { fetch('/api/setup-ce', { method: 'POST' }).catch(() => {}) }, [])

  const totalPages = Math.ceil(total / limit)

  const openCreateDialog = () => {
    setEditing(null)
    setFormCodigo('')
    setFormNombre('')
    setFormLocalidad('')
    setFormEstado('')
    setFormMunicipio('')
    setDialogOpen(true)
  }

  const openEditDialog = (c: CentroEscolar) => {
    setEditing(c)
    setFormCodigo(c.codigo)
    setFormNombre(c.nombre)
    setFormLocalidad(c.localidad || '')
    setFormEstado(c.estado || '')
    setFormMunicipio(c.municipio || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formCodigo.trim() || !formNombre.trim()) {
      toast({ title: 'Validacion', description: 'Codigo y nombre son requeridos', variant: 'destructive' })
      return
    }
    try {
      const body = { codigo: formCodigo, nombre: formNombre, localidad: formLocalidad, estado: formEstado, municipio: formMunicipio }
      if (editing) {
        const res = await fetch(`/api/centros-escolares/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const data = await res.json(); throw new Error(data.error) }
        toast({ title: 'Actualizado', description: 'Centro escolar actualizado' })
      } else {
        const res = await fetch('/api/centros-escolares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const data = await res.json(); throw new Error(data.error) }
        toast({ title: 'Creado', description: 'Centro escolar registrado' })
      }
      setDialogOpen(false)
      fetchCentros()
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message || 'Error al guardar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await fetch(`/api/centros-escolares/${deletingId}`, { method: 'DELETE' })
      toast({ title: 'Eliminado', description: 'Centro escolar eliminado' })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchCentros()
    } catch {
      toast({ title: 'Error', description: 'Error al eliminar', variant: 'destructive' })
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-teal-400" />
            <h1 className="text-lg font-bold text-white">Centros Escolares</h1>
            <span className="text-xs text-gray-400">({total} registros)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                className="pl-7 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder:text-gray-400 w-48 focus:outline-none focus:border-teal-500"
              />
            </div>
            <Button onClick={openCreateDialog} size="sm" className="bg-teal-600 hover:bg-teal-500 text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
            </div>
          ) : centros.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {searchQuery ? 'No se encontraron resultados' : 'No hay centros escolares registrados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600 hover:bg-gray-700">
                    <TableHead className="text-[10px] text-teal-300 font-bold w-20">CODIGO</TableHead>
                    <TableHead className="text-[10px] text-teal-300 font-bold">NOMBRE</TableHead>
                    <TableHead className="text-[10px] text-teal-300 font-bold">LOCALIDAD</TableHead>
                    <TableHead className="text-[10px] text-teal-300 font-bold w-32">ESTADO</TableHead>
                    <TableHead className="text-[10px] text-teal-300 font-bold w-32">MUNICIPIO</TableHead>
                    <TableHead className="text-[10px] text-teal-300 font-bold w-20">ESTADO</TableHead>
                    <TableHead className="text-[10px] text-teal-300 font-bold w-20">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centros.map(c => (
                    <TableRow key={c.id} className="border-gray-700 hover:bg-gray-750">
                      <TableCell className="text-xs text-gray-300 font-mono">{c.codigo}</TableCell>
                      <TableCell className="text-xs text-white font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-xs text-gray-400">{c.localidad}</TableCell>
                      <TableCell className="text-xs text-gray-400">{c.estado}</TableCell>
                      <TableCell className="text-xs text-gray-400">{c.municipio}</TableCell>
                      <TableCell className="text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.activo ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                          {c.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex gap-1">
                          <button onClick={() => openEditDialog(c)} className="p-1 hover:bg-gray-600 rounded" title="Editar">
                            <Pencil className="h-3 w-3 text-blue-400" />
                          </button>
                          <button onClick={() => { setDeletingId(c.id); setDeleteDialogOpen(true) }} className="p-1 hover:bg-gray-600 rounded" title="Eliminar">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-xs text-white">Anterior</button>
            <span className="text-xs text-gray-400">Pagina {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-xs text-white">Siguiente</button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">{editing ? 'Editar Centro Escolar' : 'Agregar Centro Escolar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-gray-300">Codigo *</Label>
              <Input value={formCodigo} onChange={e => setFormCodigo(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-xs h-8 mt-1" placeholder="Ej: 0001" />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Nombre *</Label>
              <Input value={formNombre} onChange={e => setFormNombre(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-xs h-8 mt-1" placeholder="Nombre del plantel" />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Localidad</Label>
              <Input value={formLocalidad} onChange={e => setFormLocalidad(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-xs h-8 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-300">Estado</Label>
                <Input value={formEstado} onChange={e => setFormEstado(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-xs h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-300">Municipio</Label>
                <Input value={formMunicipio} onChange={e => setFormMunicipio(e.target.value)} className="bg-gray-700 border-gray-600 text-white text-xs h-8 mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setDialogOpen(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">Cancelar</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded text-xs text-white font-bold">
              {editing ? 'Actualizar' : 'Crear'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-sm">Eliminar Centro Escolar</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-xs">
              Esta accion no se puede deshacer. Se eliminara el centro escolar permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-700 hover:bg-red-600 text-white text-xs">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}