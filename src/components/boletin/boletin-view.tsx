'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, Printer } from 'lucide-react';
import { formatCedulaFinal } from '@/lib/school-config';

interface StudentData {
  id: string;
  cedula: string;
  apellidos: string;
  nombres: string;
}

interface BoletinData {
  [year: string]: {
    [lapso: string]: Array<{ materia: string; nota: string; tipo: string }>;
  };
}

export default function BoletinView() {
  const [searchCedula, setSearchCedula] = useState('');
  const [searchResults, setSearchResults] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [boletin, setBoletin] = useState<BoletinData | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loadingBoletin, setLoadingBoletin] = useState(false);

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

  const selectStudent = async (student: StudentData) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setLoadingBoletin(true);
    try {
      const res = await fetch(`/api/boletin?studentId=${student.id}`);
      const data = await res.json();
      setBoletin(data.boletin || {});
      const years = Object.keys(data.boletin || {}).sort();
      if (years.length > 0) setSelectedYear(years[years.length - 1]);
    } catch {
      setBoletin(null);
    } finally {
      setLoadingBoletin(false);
    }
  };

  const years = boletin ? Object.keys(boletin).sort() : [];
  const lapsos = boletin && selectedYear && boletin[selectedYear] ? Object.keys(boletin[selectedYear]).sort() : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Boletín de Notas</h2>
        <p className="text-muted-foreground">Consultar calificaciones por alumno</p>
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
                    <p className="text-xs text-muted-foreground">{formatCedulaFinal(s.cedula)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loadingBoletin && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">Cargando boletín...</CardContent>
        </Card>
      )}

      {selectedStudent && boletin && !loadingBoletin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Boletín — {selectedStudent.apellidos}, {selectedStudent.nombres}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{formatCedulaFinal(selectedStudent.cedula)}</p>
              </div>
              <div className="flex gap-2 no-print">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>Año {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => window.print()} className="gap-2">
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {years.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No se encontraron calificaciones para este alumno</p>
            ) : (
              <div className="space-y-4">
                {/* Year summary */}
                <div className="flex flex-wrap gap-2">
                  {years.map(y => (
                    <Badge
                      key={y}
                      variant={y === selectedYear ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedYear(y)}
                    >
                      {y}
                    </Badge>
                  ))}
                </div>

                {/* Grades by lapso */}
                {selectedYear && boletin[selectedYear] && (
                  <div className="space-y-4">
                    {lapsos.map(lapso => (
                      <div key={lapso} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-green-50 px-4 py-2 font-semibold text-sm text-green-800">
                          Lapso {lapso} — Año Escolar {selectedYear}
                        </div>
                        <div className="p-4">
                          {boletin[selectedYear][lapso].length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin calificaciones</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {boletin[selectedYear][lapso].map((materia, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50">
                                  <div>
                                    <p className="text-xs font-medium">{materia.materia}</p>
                                    <p className="text-[10px] text-muted-foreground">Tipo: {materia.tipo}</p>
                                  </div>
                                  <Badge variant={parseInt(materia.nota) >= 10 ? 'default' : 'destructive'} className="font-mono">
                                    {materia.nota}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
