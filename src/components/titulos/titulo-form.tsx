'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Scroll, Printer } from 'lucide-react';

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

export default function TituloForm() {
  const [searchCedula, setSearchCedula] = useState('');
  const [searchResults, setSearchResults] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [grado, setGrado] = useState('5° año');
  const [anioEscolar, setAnioEscolar] = useState(new Date().getFullYear().toString());

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
      const res = await fetch('/api/titulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id, grado, anioEscolar }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerated(true);
      } else {
        alert(data.error || 'Error al generar título');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Títulos</h2>
        <p className="text-muted-foreground">Generar título de bachiller</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Alumno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Ingrese cédula del alumno" value={searchCedula}
              onChange={(e) => setSearchCedula(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1" />
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
                    <p className="text-xs text-muted-foreground">{s.cedula}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && !generated && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scroll className="w-5 h-5" />
              Datos del Título
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Alumno</p>
                <p className="font-medium">{selectedStudent.apellidos}, {selectedStudent.nombres}</p>
                <p className="text-xs text-muted-foreground">{selectedStudent.cedula}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grado</label>
                <Input value={grado} onChange={(e) => setGrado(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Año Escolar</label>
                <Input value={anioEscolar} onChange={(e) => setAnioEscolar(e.target.value)} />
              </div>
            </div>
            <Button onClick={generate} disabled={generating} className="w-full gap-2">
              {generating ? 'Generando...' : <><Scroll className="w-4 h-4" /> Generar Título</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {generated && selectedStudent && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Título de Bachiller</CardTitle>
              <Button variant="outline" onClick={() => window.print()} className="gap-2 no-print">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white border-2 border-green-700 rounded-lg p-10 space-y-8 text-sm max-w-2xl mx-auto">
              <div className="text-center space-y-3">
                <p className="font-bold text-xl text-green-800">REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
                <p className="font-semibold text-green-700">MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN</p>
                <p className="font-semibold text-green-700">ZONA EDUCATIVA DEL ESTADO MIRANDA</p>
                <Separator className="bg-green-700" />
                <p className="font-bold text-lg mt-2">TÍTULO DE BACHILLER</p>
              </div>

              <div className="text-xs space-y-1 text-center">
                <p>Se otorga el presente título a:</p>
              </div>

              <div className="text-center space-y-2">
                <p className="text-2xl font-bold">{selectedStudent.apellidos}</p>
                <p className="text-2xl font-bold">{selectedStudent.nombres}</p>
                <p className="text-sm">Cédula de Identidad: <strong>{selectedStudent.cedula}</strong></p>
                <p className="text-sm">Fecha de Nacimiento: <strong>{selectedStudent.fechaNacimiento || 'N/D'}</strong></p>
              </div>

              <div className="text-center text-xs space-y-1">
                <p>Por haber culminado satisfactoriamente los estudios de <strong>Education Media General</strong> correspondiente al <strong>{grado}</strong> de Educación Secundaria, durante el año escolar <strong>{anioEscolar}</strong>.</p>
              </div>

              <Separator />

              <div className="text-center text-xs space-y-1">
                <p className="font-semibold">Plantel: {SCHOOL_INFO.nombre}</p>
                <p>Código OD: {SCHOOL_INFO.codigo}</p>
                <p>Municipio {SCHOOL_INFO.municipio}, Estado {SCHOOL_INFO.entidad}</p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="pt-12 border-t border-border">
                  <p className="text-xs font-semibold">_________________________</p>
                  <p className="text-xs">Ministro(a) de Educación</p>
                </div>
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
                <Scroll className="w-4 h-4" /> Nuevo Título
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
