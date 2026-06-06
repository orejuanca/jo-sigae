'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StudentSearch } from '@/components/student-search'
import {
  Users,
  FileText,
  ScrollText,
  BookOpen,
  Award,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    totalStudents: number
    totalCertificaciones: number
    totalConstancias: number
    totalBoletines: number
    totalTitulos: number
    totalDocumentos: number
  } | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const limit = 10

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/students?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(data => {
        setStudents(data.students || [])
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchQuery, page])

  const totalPages = Math.ceil(total / limit)

  const statsCards = [
    { label: 'Total Alumnos', value: stats?.totalStudents ?? 0, icon: Users, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Certificaciones', value: stats?.totalCertificaciones ?? 0, icon: FileText, color: 'text-blue-600 bg-blue-100' },
    { label: 'Constancias', value: stats?.totalConstancias ?? 0, icon: ScrollText, color: 'text-amber-600 bg-amber-100' },
    { label: 'Boletines', value: stats?.totalBoletines ?? 0, icon: BookOpen, color: 'text-purple-600 bg-purple-100' },
  ]

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground">Sistema de Certificaciones Escolares — EMG 31059</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/certificaciones">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
              <FileText className="h-5 w-5" />
              <span className="text-xs">Nueva Certificación</span>
            </Button>
          </Link>
          <Link href="/constancias">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
              <ScrollText className="h-5 w-5" />
              <span className="text-xs">Nueva Constancia</span>
            </Button>
          </Link>
          <Link href="/boletin">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Boletín</span>
            </Button>
          </Link>
          <Link href="/titulos">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
              <Award className="h-5 w-5" />
              <span className="text-xs">Título</span>
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Búsqueda Rápida de Alumnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Buscar por cédula, apellidos o nombres..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="flex-1"
              />
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && students.length > 0 && (
              <>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Cédula</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono text-xs">{student.cedula}</TableCell>
                          <TableCell className="font-medium">{student.apellidos}</TableCell>
                          <TableCell>{student.nombres}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                                <Link href={`/certificaciones?s=${student.id}`}>Cert</Link>
                              </Badge>
                              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                                <Link href={`/boletin?s=${student.id}`}>Bol</Link>
                              </Badge>
                              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                                <Link href={`/titulos?s=${student.id}`}>Tít</Link>
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center text-sm px-2">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && searchQuery && students.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No se encontraron alumnos con &quot;{searchQuery}&quot;
              </p>
            )}
            {!loading && !searchQuery && students.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                Escribe para buscar alumnos...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
