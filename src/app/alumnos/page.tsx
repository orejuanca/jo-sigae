'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
}

export default function AlumnosPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formCedula, setFormCedula] = useState('')
  const [formApellidos, setFormApellidos] = useState('')
  const [formNombres, setFormNombres] = useState('')
  const [formFecha, setFormFecha] = useState('')
  const [formPais, setFormPais] = useState('VENEZUELA')

  const { toast } = useToast()

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${limit}`)
      const data = await res.json()
      setStudents(data.students || [])
      setTotal(data.total || 0)
    } catch {
      toast({ title: 'Error', description: 'Error al cargar alumnos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [searchQuery, page])

  const totalPages = Math.ceil(total / limit)

  const openCreateDialog = () => {
    setEditingStudent(null)
    setFormCedula('')
    setFormApellidos('')
    setFormNombres('')
    setFormFecha('')
    setFormPais('VENEZUELA')
    setDialogOpen(true)
  }

  const openEditDialog = (student: Student) => {
    setEditingStudent(student)
    setFormCedula(student.cedula)
    setFormApellidos(student.apellidos)
    setFormNombres(student.nombres)
    setFormFecha(student.fechaNacimiento || '')
    setFormPais(student.pais || 'VENEZUELA')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formCedula || !formApellidos || !formNombres) {
      toast({ title: 'Error', description: 'Todos los campos requeridos', variant: 'destructive' })
      return
    }

    try {
      const body = {
        cedula: formCedula,
        apellidos: formApellidos,
        nombres: formNombres,
        fechaNacimiento: formFecha,
        pais: formPais,
      }

      if (editingStudent) {
        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error)
        }
        toast({ title: 'Actualizado', description: 'Alumno actualizado correctamente' })
      } else {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error)
        }
        toast({ title: 'Creado', description: 'Alumno registrado correctamente' })
      }

      setDialogOpen(false)
      fetchStudents()
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message || 'Error al guardar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await fetch(`/api/students/${deletingId}`, { method: 'DELETE' })
      toast({ title: 'Eliminado', description: 'Alumno eliminado' })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchStudents()
    } catch {
      toast({ title: 'Error', description: 'Error al eliminar', variant: 'destructive' })
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Alumnos</h1>
            <p className="text-muted-foreground">Gestión de alumnos registrados ({total.toLocaleString()} total)</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Alumno
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cédula, apellidos o nombres..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No se encontraron alumnos</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[130px]">Cédula</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead className="hidden sm:table-cell">Fecha Nac.</TableHead>
                        <TableHead className="hidden md:table-cell">País</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono text-xs">{student.cedula}</TableCell>
                          <TableCell className="font-medium">{student.apellidos}</TableCell>
                          <TableCell>{student.nombres}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{student.fechaNacimiento || '—'}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{student.pais || '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(student)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(student.id); setDeleteDialogOpen(true) }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center text-sm px-2">{page} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Cédula *</Label>
              <Input value={formCedula} onChange={(e) => setFormCedula(e.target.value)} placeholder="Ej: V12345678" />
            </div>
            <div className="grid gap-2">
              <Label>Apellidos *</Label>
              <Input value={formApellidos} onChange={(e) => setFormApellidos(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Nombres *</Label>
              <Input value={formNombres} onChange={(e) => setFormNombres(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha de Nacimiento</Label>
                <Input type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>País</Label>
                <Input value={formPais} onChange={(e) => setFormPais(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingStudent ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar alumno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los documentos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
