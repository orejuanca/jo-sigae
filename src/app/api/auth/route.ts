import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSide } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ success: false, message: 'Contraseña requerida' }, { status: 400 });
    }
    if (verifyServerSide(password)) {
      return NextResponse.json({ success: true, message: 'Autenticación exitosa' });
    }
    return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, message: 'Error de servidor' }, { status: 500 });
  }
}
