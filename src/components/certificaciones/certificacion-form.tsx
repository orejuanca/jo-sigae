'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Search, FileText, Printer, Download } from 'lucide-react';

interface StudentData {
  id: string;
  cedula: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: string | null;
  pais: string;
  estado: string;
  municipio: string;
  plan: string;
}

interface School {
  name: string;
  location: string;
  code: string;
}

interface GradeEntry {
  nota: string;
  tipo: string;
  lapso: number;
}

interface CertData {
  certification: { id: string; tipo: string };
  student: StudentData;
  schools: School[];
  gradesByYear: Record<string, GradeEntry[]>;
  observations: string[];
}

const SCHOOL_INFO = {
  codigo: 'OD16751520',
  nombre: 'U E N CREACIÓN CÚA',
  direccion: 'Urb. José de S. Martín - Sector Los Bloques - Nueva Cúa',
  telefono: '(0239) 7163530',
  municipio: 'Rafael Urdaneta',
  entidad: 'Miranda',
  zonaEducativa: 'Miranda',
};

export default function CertificacionForm() {
  const [searchCedula, setSearchCedula] = useState('');
  const [searchResults, setSearchResults] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [certData, setCertData] = useState<CertData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  const handleSearch = async () => {
    if (!searchCedula.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(searchCedula)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.students || []);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: StudentData) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setCertData(null);
  };

  const generateCert = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/certificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id, observaciones }),
      });
      const data = await res.json();
      if (res.ok) {
        setCertData(data);
      } else {
        alert(data.error || 'Error al generar certificación');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Certificaciones (EMG 31059)</h2>
        <p className="text-muted-foreground">Generar certificación de estudios</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Alumno por Cédula
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ingrese cédula del alumno (ej: V 12345678)"
              value={searchCedula}
              onChange={(e) => setSearchCedula(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectStudent(s)}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer border border-border/50"
                >
                  <div>
                    <p className="text-sm font-medium">{s.apellidos}, {s.nombres}</p>
                    <p className="text-xs text-muted-foreground">{s.cedula}</p>
                  </div>
                  <Badge variant="secondary">{s.plan}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected student & generate */}
      {selectedStudent && !certData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Datos del Alumno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cédula</p>
                <p className="font-medium font-mono">{selectedStudent.cedula}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <Badge variant="default">{selectedStudent.plan}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Apellidos</p>
                <p className="font-medium">{selectedStudent.apellidos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombres</p>
                <p className="font-medium">{selectedStudent.nombres}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                <p className="font-medium">{selectedStudent.fechaNacimiento || 'No registrada'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">País / Estado</p>
                <p className="font-medium">{selectedStudent.pais} — {selectedStudent.estado}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones adicionales</label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones (opcional)"
                rows={3}
              />
            </div>
            <Button onClick={generateCert} disabled={generating} className="w-full gap-2">
              {generating ? 'Generando...' : <><FileText className="w-4 h-4" /> Generar Certificación</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Certificate Preview */}
      {certData && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Vista Previa — Certificación de Estudios</CardTitle>
              <div className="flex gap-2 no-print">
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div id="cert-print" className="bg-white border border-border rounded-lg p-8 space-y-6 text-sm">
              {/* Header */}
              <div className="text-center border-b-2 border-green-700 pb-4">
                <p className="font-bold text-lg text-green-800">REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
                <p className="font-semibold text-green-700">MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN</p>
                <p className="font-semibold text-green-700">ZONA EDUCATIVA DEL ESTADO MIRANDA</p>
                <p className="mt-2 font-bold text-base">CERTIFICACIÓN DE ESTUDIOS</p>
                <p className="text-xs text-muted-foreground">EMG 31059</p>
              </div>

              {/* School Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p><span className="font-semibold">Plantel:</span> {SCHOOL_INFO.nombre}</p>
                  <p><span className="font-semibold">Código:</span> {SCHOOL_INFO.codigo}</p>
                  <p><span className="font-semibold">Dirección:</span> {SCHOOL_INFO.direccion}</p>
                  <p><span className="font-semibold">Teléfono:</span> {SCHOOL_INFO.telefono}</p>
                </div>
                <div>
                  <p><span className="font-semibold">Municipio:</span> {SCHOOL_INFO.municipio}</p>
                  <p><span className="font-semibold">Entidad Federal:</span> {SCHOOL_INFO.entidad}</p>
                  <p><span className="font-semibold">Zona Educativa:</span> {SCHOOL_INFO.zonaEducativa}</p>
                </div>
              </div>

              <Separator />

              {/* Student Info */}
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-sm">DATOS DEL ESTUDIANTE</p>
                <p><span className="font-medium">Cédula de Identidad:</span> {certData.student.cedula}</p>
                <p><span className="font-medium">Apellidos:</span> {certData.student.apellidos}</p>
                <p><span className="font-medium">Nombres:</span> {certData.student.nombres}</p>
                <p><span className="font-medium">Fecha de Nacimiento:</span> {certData.student.fechaNacimiento || 'N/D'}</p>
                <p><span className="font-medium">País:</span> {certData.student.pais}</p>
                <p><span className="font-medium">Estado:</span> {certData.student.estado}</p>
                <p><span className="font-medium">Municipio:</span> {certData.student.municipio}</p>
                <p><span className="font-medium">Plan:</span> {certData.student.plan}</p>
              </div>

              <Separator />

              {/* Schools */}
              {certData.schools.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">PLANTELES CURSADOS</p>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="border border-border p-1.5 text-left">N°</th>
                        <th className="border border-border p-1.5 text-left">Plantel</th>
                        <th className="border border-border p-1.5 text-left">Localidad</th>
                        <th className="border border-border p-1.5 text-left">Código</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certData.schools.map((school, i) => (
                        <tr key={i}>
                          <td className="border border-border p-1.5">{i + 1}</td>
                          <td className="border border-border p-1.5">{school.name}</td>
                          <td className="border border-border p-1.5">{school.location}</td>
                          <td className="border border-border p-1.5">{school.code || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Grades */}
              {certData.gradesByYear && Object.keys(certData.gradesByYear).length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">CALIFICACIONES POR AÑO ESCOLAR</p>
                  {Object.entries(certData.gradesByYear)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([year, grades]) => (
                      <div key={year} className="border border-border rounded p-2">
                        <p className="font-medium text-xs mb-1 text-green-800">Año Escolar {year}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                          {grades.slice(0, 12).map((g, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs bg-muted/30 rounded px-1.5 py-0.5">
                              <span className="font-mono font-semibold text-green-800">{g.nota}</span>
                              <span className="text-muted-foreground">({g.tipo})</span>
                              <span className="text-muted-foreground text-[10px]">L{g.lapso}</span>
                            </div>
                          ))}
                          {grades.length > 12 && (
                            <p className="text-xs text-muted-foreground">... +{grades.length - 12} calificaciones</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Observations */}
              {(certData.observations.length > 0 || observaciones) && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">OBSERVACIONES</p>
                  {certData.observations.map((obs, i) => (
                    <p key={i} className="text-xs border-l-2 border-green-600 pl-2">{obs}</p>
                  ))}
                  {observaciones && (
                    <p className="text-xs border-l-2 border-green-600 pl-2">{observaciones}</p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 grid grid-cols-2 gap-8 text-center">
                <div className="pt-12 border-t border-border">
                  <p className="text-xs font-semibold">_________________________</p>
                  <p className="text-xs">Director(a) del Plantel</p>
                </div>
                <div className="pt-12 border-t border-border">
                  <p className="text-xs font-semibold">_________________________</p>
                  <p className="text-xs">Secretaria</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2 no-print">
              <Button variant="outline" onClick={() => { setCertData(null); setSelectedStudent(null); setObservaciones(''); }} className="gap-2">
                <FileText className="w-4 h-4" /> Nueva Certificación
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
