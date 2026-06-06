'use client'

import { useState, useEffect } from 'react'
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
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  Search,
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

interface Certification {
  id: string
  tipo: string
  numero: string
  datos: string | null
  emitidoEl: string
  studentId: string
}

const tipoLabels: Record<string, string> = {
  CERTIFICACION: 'Certificación de Estudios',
  CONSTANCIA: 'Constancia de Egreso',
  BOLETIN: 'Boletín de Calificaciones',
  TITULO: 'Título de Bachiller',
}

const tipoColors: Record<string, string> = {
  CERTIFICACION: 'bg-blue-100 text-blue-700',
  CONSTANCIA: 'bg-amber-100 text-amber-700',
  BOLETIN: 'bg-purple-100 text-purple-700',
  TITULO: 'bg-emerald-100 text-emerald-700',
}

export default function ValidarPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setSearchQuery(`${student.apellidos}, ${student.nombres}`)
    loadCertifications(student.id)
  }

  const loadCertifications = async (studentId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/certifications/${studentId}`)
      const data = await res.json()
      setCertifications(data || [])
    } catch {
      setCertifications([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (tipo: string) => {
    return <CheckCircle className="h-4 w-4 text-emerald-600" />
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-VE')
    } catch {
      return dateStr
    }
  }

  const getStatusSummary = () => {
    const tipos = ['CERTIFICACION', 'CONSTANCIA', 'BOLETIN', 'TITULO']
    return tipos.map(tipo => {
      const found = certifications.find(c => c.tipo === tipo)
      return { tipo, found }
    })
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Validar Documentos</h1>
          <p className="text-muted-foreground">Verificar estado de certificaciones, constancias y documentos</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar Alumno para Validar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudentSearch onSelect={handleSelectStudent} placeholder="Buscar por cédula, apellidos o nombres..." />
          </CardContent>
        </Card>

        {selectedStudent && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedStudent.apellidos}, {selectedStudent.nombres}
                  <span className="font-normal text-muted-foreground ml-2">C.I.: {selectedStudent.cedula}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {getStatusSummary().map(({ tipo, found }) => (
                    <div key={tipo} className={`p-4 rounded-lg border ${found ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-muted/30'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {found ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/50" />
                        )}
                        <span className="text-xs font-medium">{tipoLabels[tipo]}</span>
                      </div>
                      {found ? (
                        <p className="text-xs text-muted-foreground">
                          Emitido: {formatDate(found.emitidoEl)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No emitido</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Historial de Documentos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loading && certifications.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay documentos registrados para este alumno
                  </p>
                )}

                {!loading && certifications.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Fecha Emisión</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certifications.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <Badge className={tipoColors[cert.tipo] || ''} variant="secondary">
                              {tipoLabels[cert.tipo] || cert.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{cert.numero}</TableCell>
                          <TableCell className="text-sm">{formatDate(cert.emitidoEl)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(cert.tipo)}
                              <span className="text-sm text-emerald-600 font-medium">Válido</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
