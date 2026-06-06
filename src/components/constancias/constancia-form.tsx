'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Award, Printer } from 'lucide-react';
import { formatCedulaFinal } from '@/lib/school-config';

interface StudentData {
  id: string;
  cedula: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: string | null;
  pais: string;
  estado: string;
  municipio: string;
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

export default function ConstanciaForm() {
  const [searchCedula, setSearchCedula] = useState('');
  const [searchResults, setSearchResults] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [razon, setRazon] = useState('Culminación de estudios');

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
    setGenerated(false);
  };

  const generate = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/constancias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id, fechaEgreso, razon }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerated(true);
      } else {
        alert(data.error || 'Error al generar constancia');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  const today = new Date().toLocaleDateString('es-VE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Constancia de Egreso</h2>
        <p className="text-muted-foreground">Generar constancia de egreso del plantel</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Alumno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ingrese cédula del alumno"
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
                <div key={s.id} onClick={() => selectStudent(s)}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer border border-border/50">
                  <div>
                    <p className="text-sm font-medium">{s.apellidos}, {s.nombres}</p>
                    <p className="text-xs text-muted-foreground">{formatCedulaFinal(s.cedula)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected student */}
      {selectedStudent && !generated && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Datos para la Constancia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Alumno</p>
                <p className="font-medium">{selectedStudent.apellidos}, {selectedStudent.nombres}</p>
                <p className="text-xs text-muted-foreground">{formatCedulaFinal(selectedStudent.cedula)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Egreso</label>
                <Input type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Razón del Egreso</label>
              <Input value={razon} onChange={(e) => setRazon(e.target.value)} placeholder="Razón del egreso" />
            </div>
            <Button onClick={generate} disabled={generating} className="w-full gap-2">
              {generating ? 'Generando...' : <><Award className="w-4 h-4" /> Generar Constancia</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {generated && selectedStudent && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Constancia de Egreso</CardTitle>
              <Button variant="outline" onClick={() => window.print()} className="gap-2 no-print">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white border border-border rounded-lg p-8 space-y-6 text-sm max-w-2xl mx-auto">
              <div className="text-center border-b-2 border-green-700 pb-4">
                <p className="font-bold text-lg text-green-800">REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
                <p className="font-semibold text-green-700">MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN</p>
                <p className="font-semibold text-green-700">ZONA EDUCATIVA DEL ESTADO MIRANDA</p>
                <p className="mt-2 font-bold text-base">CONSTANCIA DE EGRESO</p>
              </div>

              <div className="text-xs space-y-1">
                <p><span className="font-semibold">Plantel:</span> {SCHOOL_INFO.nombre}</p>
                <p><span className="font-semibold">Código OD:</span> {SCHOOL_INFO.codigo}</p>
                <p><span className="font-semibold">Dirección:</span> {SCHOOL_INFO.direccion}</p>
              </div>

              <Separator />

              <div className="text-justify text-xs space-y-2 leading-relaxed">
                <p>Quien suscribe, <strong>Director(a)</strong> del Plantel <strong>{SCHOOL_INFO.nombre}</strong>, código <strong>{SCHOOL_INFO.codigo}</strong>, ubicado en <strong>{SCHOOL_INFO.direccion}</strong>, Municipio {SCHOOL_INFO.municipio}, Estado {SCHOOL_INFO.entidad}, por medio de la presente hace constar que:</p>
                <p className="font-semibold">El/La estudiante {selectedStudent.apellidos}, {selectedStudent.nombres}, titular de la cédula de identidad {formatCedulaFinal(selectedStudent.cedula)}, cursó estudios en esta institución y egresó el día {fechaEgreso || 'N/D'} por la razón: <strong>{razon}</strong>.</p>
                <p>Se extiende la presente constancia a solicitud de parte interesada, en la ciudad de Nueva Cúa, a los {today}.</p>
              </div>

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

            <div className="mt-4 flex gap-2 no-print">
              <Button variant="outline" onClick={() => { setGenerated(false); setSelectedStudent(null); }} className="gap-2">
                <Award className="w-4 h-4" /> Nueva Constancia
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
