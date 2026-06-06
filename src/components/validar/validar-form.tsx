'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { formatCedulaFinal } from '@/lib/school-config';

interface StudentData {
  id: string;
  cedula: string;
  apellidos: string;
  nombres: string;
}

interface ValidationResult {
  student: StudentData;
  issues: string[];
  totalGrades: number;
  validGrades: number;
  isValid: boolean;
}

export default function ValidarForm() {
  const [searchCedula, setSearchCedula] = useState('');
  const [searchResults, setSearchResults] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

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
    setResult(null);
  };

  const validate = async () => {
    if (!selectedStudent) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/validar?studentId=${selectedStudent.id}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Validar Notas</h2>
        <p className="text-muted-foreground">Verificar consistencia de calificaciones</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Alumno a Validar
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

      {selectedStudent && !result && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedStudent.apellidos}, {selectedStudent.nombres}</p>
                <p className="text-xs text-muted-foreground">{formatCedulaFinal(selectedStudent.cedula)}</p>
              </div>
              <Button onClick={validate} disabled={validating} className="gap-2">
                {validating ? 'Validando...' : <><CheckCircle className="w-4 h-4" /> Validar Notas</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resultado de la Validación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{result.student.apellidos}, {result.student.nombres}</p>
                <p className="text-xs text-muted-foreground">{formatCedulaFinal(result.student.cedula)}</p>
              </div>
              <Badge variant={result.isValid ? 'default' : 'destructive'}>
                {result.isValid ? 'Válido' : 'Problemas encontrados'}
              </Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Calificaciones</p>
                <p className="text-2xl font-bold">{result.totalGrades}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Calificaciones Válidas</p>
                <p className="text-2xl font-bold text-green-700">{result.validGrades}</p>
              </div>
            </div>

            <Separator />

            {/* Issues */}
            <div className="space-y-2">
              <p className="font-semibold text-sm">Detalles</p>
              {result.issues.map((issue, i) => (
                <Alert key={i} variant={issue.includes('inválida') || issue.includes('vacía') || issue.includes('No se') ? 'destructive' : issue.includes('Sin problemas') ? 'default' : 'default'}>
                  {issue.includes('inválida') || issue.includes('vacía') || issue.includes('No se') ? (
                    <XCircle className="h-4 w-4" />
                  ) : issue.includes('Sin problemas') ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle className="text-sm">{issue.includes('Sin problemas') ? 'Sin Problemas' : issue.includes('inválida') ? 'Error' : 'Información'}</AlertTitle>
                  <AlertDescription className="text-xs">{issue}</AlertDescription>
                </Alert>
              ))}
            </div>

            <Button variant="outline" onClick={() => { setResult(null); setSelectedStudent(null); }} className="w-full gap-2">
              <CheckCircle className="w-4 h-4" /> Validar otro alumno
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
