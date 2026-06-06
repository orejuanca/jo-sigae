'use client';

import { useState } from 'react';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: () => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        login(password);
        onLogin();
      } else {
        setError(data.message || 'Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-green-200">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20">
            <img src="/school-logo.png" alt="Escudo U.E.N. Creación Cúa" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">
              U.E.N. Creación Cúa
            </CardTitle>
            <CardDescription className="text-sm mt-1 text-muted-foreground">
              Sistema de Certificaciones Escolares
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Código OD16751520</p>
            <p>Urb. José de S. Martín - Sector Los Bloques - Nueva Cúa</p>
            <p>Municipio Rafael Urdaneta, Miranda</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Contraseña de Acceso
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese la contraseña del sistema"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading || !password}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ministerio del Poder Popular para la Educación
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
