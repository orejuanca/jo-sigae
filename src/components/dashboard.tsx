'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Search, TrendingUp, Database, Clock } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<{ totalStudents: number; totalCertifications: number; planVigente: number; planDerogado: number } | null>(null);
  const [recentStudents, setRecentStudents] = useState<Array<{ id: string; cedula: string; apellidos: string; nombres: string; plan: string }>>([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; cedula: string; apellidos: string; nombres: string }>>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    // Load stats
    fetch('/api/seed').then(r => r.json()).then(setStats);

    // Load recent students
    fetch('/api/students?limit=10').then(r => r.json()).then(data => {
      setRecentStudents(data.students || []);
    });
  }, []);

  const handleSearch = useCallback(async (query?: string) => {
    const q = (query || search).trim();
    if (!q) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
        setSearchResults([]);
      } else {
        setSearchResults(data.students || []);
      }
    } catch {
      setSearchError('Error de conexión');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [search]);

  const statCards = [
    { label: 'Total Alumnos', value: stats?.totalStudents ?? '—', icon: <Users className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Plan Vigente', value: stats?.planVigente ?? '—', icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
    { label: 'Plan Derogado', value: stats?.planDerogado ?? '—', icon: <Database className="w-5 h-5" />, color: 'text-teal-600 bg-teal-50' },
    { label: 'Certificaciones', value: stats?.totalCertifications ?? '0', icon: <FileText className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Panel de control — U.E.N. Creación Cúa</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Búsqueda Rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por cédula, nombre o apellido..."
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                if (val.trim().length >= 2) {
                  handleSearch(val);
                } else {
                  setSearchResults([]);
                  setSearchError('');
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={() => handleSearch()} disabled={searching || !search.trim()}>
              {searching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
          {searching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Buscando...
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => onNavigate('students')}
                >
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

      {/* Recent students */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Alumnos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentStudents.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 border border-border/50"
                >
                  <div>
                    <p className="text-sm font-medium">{s.apellidos}, {s.nombres}</p>
                    <p className="text-xs text-muted-foreground">{s.cedula}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {s.plan}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
