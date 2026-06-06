'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-react';

interface Student {
  id: string;
  cedula: string;
  apellidos: string;
  nombres: string;
  pais: string;
  estado: string;
  municipio: string;
  plan: string;
  fechaNacimiento: string | null;
}

export default function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form state
  const [form, setForm] = useState({
    cedula: '',
    apellidos: '',
    nombres: '',
    pais: 'VENEZUELA',
    estado: '',
    municipio: '',
    fechaNacimiento: '',
  });

  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const resetForm = () => {
    setForm({ cedula: '', apellidos: '', nombres: '', pais: 'VENEZUELA', estado: '', municipio: '', fechaNacimiento: '' });
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdd(false);
        resetForm();
        fetchStudents();
      } else {
        alert(data.error || 'Error al crear alumno');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const handleEdit = async () => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEdit(false);
        resetForm();
        fetchStudents();
      } else {
        alert(data.error || 'Error al actualizar');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDelete(false);
        setSelectedStudent(null);
        fetchStudents();
      } else {
        alert('Error al eliminar');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setForm({
      cedula: student.cedula,
      apellidos: student.apellidos,
      nombres: student.nombres,
      pais: student.pais,
      estado: student.estado,
      municipio: student.municipio,
      fechaNacimiento: student.fechaNacimiento || '',
    });
    setShowEdit(true);
  };

  const openDelete = (student: Student) => {
    setSelectedStudent(student);
    setShowDelete(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Alumnos</h2>
          <p className="text-muted-foreground">Gestión de alumnos — {total} registros</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Agregar Alumno
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cédula, nombre o apellido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Cédula</TableHead>
                  <TableHead>Apellidos</TableHead>
                  <TableHead>Nombres</TableHead>
                  <TableHead className="hidden md:table-cell">País</TableHead>
                  <TableHead className="hidden lg:table-cell">Estado</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron alumnos
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.cedula}</TableCell>
                      <TableCell className="font-medium">{s.apellidos}</TableCell>
                      <TableCell>{s.nombres}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{s.pais}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{s.estado}</TableCell>
                      <TableCell>
                        <Badge variant={s.plan === 'vigente' ? 'default' : 'secondary'}>
                          {s.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDelete(s)} title="Eliminar" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">Página {page} de {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Alumno</DialogTitle>
            <DialogDescription>Ingrese los datos del nuevo alumno</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cédula *</label>
                <Input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} placeholder="V-12345678" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Nacimiento</label>
                <Input value={form.fechaNacimiento} onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} placeholder="YYYY-MM-DD" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellidos *</label>
                <Input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} placeholder="Apellidos del alumno" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombres *</label>
                <Input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} placeholder="Nombres del alumno" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">País</label>
                <Input value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} placeholder="VENEZUELA" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="Miranda" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Municipio</label>
                <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} placeholder="Rafael Urdaneta" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Alumno</DialogTitle>
            <DialogDescription>Modifique los datos del alumno</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cédula</label>
                <Input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Nacimiento</label>
                <Input value={form.fechaNacimiento} onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellidos</label>
                <Input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombres</label>
                <Input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">País</label>
                <Input value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Municipio</label>
                <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={handleEdit} className="gap-2">
              <Pencil className="w-4 h-4" />
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Alumno</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar al alumno{' '}
              <strong>{selectedStudent?.apellidos}, {selectedStudent?.nombres}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
