import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

interface StudentRecord {
  CEDULA: string;
  FECHA: string;
  APELLIDOS: string;
  NOMBRES: string;
  PAIS: string;
  ESTADO: string;
  MUNICIPIO: string;
  [key: string]: unknown;
}

async function seedStudents(filePath: string, plan: string) {
  const rawData = readFileSync(filePath, 'utf-8');
  const records: StudentRecord[] = JSON.parse(rawData);

  // Normalizar fecha a DD/MM/YYYY
  function normalizeFecha(fecha: string): string {
    if (!fecha) return '';
    const trimmed = fecha.trim();
    if (!trimmed) return '';
    // Ya en DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
    // ISO format
    if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      try {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }
      } catch { /* ignore */ }
    }
    return trimmed;
  }

  // Normalizar cédula: garantizar formato "X NNNNNNN" (letra + espacio + número)
  // Ejemplo: "E84607347" → "E 84607347", "V-12345" → "V 12345", "E 84607347" → "E 84607347"
  function formatCedula(raw: string): string {
    const trimmed = raw.trim().toUpperCase();
    // Si ya tiene formato "X NNNN" con espacio, devolver tal cual
    if (/^[VE]\s\d/.test(trimmed)) return trimmed;
    // Si es "XNNNN" o "X-NNNN" o "X.NNNN" sin espacio correcto, normalizar
    const match = trimmed.match(/^([VE])[^\d]*(\d.+)$/);
    if (match) return `${match[1]} ${match[2]}`;
    return trimmed;
  }

  let count = 0;
  for (const record of records) {
    if (!record.CEDULA || record.CEDULA.trim() === '') continue;

    const cedula = formatCedula(record.CEDULA);
    const apellidos = (record.APELLIDOS || '').trim();
    const nombres = (record.NOMBRES || '').trim();
    if (!apellidos && !nombres) continue;

    try {
      await db.student.upsert({
        where: { cedula },
        create: {
          cedula,
          fechaNacimiento: normalizeFecha(record.FECHA || ''),
          apellidos,
          nombres,
          pais: (record.PAIS || 'VENEZUELA').trim(),
          estado: (record.ESTADO || '').trim(),
          municipio: (record.MUNICIPIO || '').trim(),
          plan,
          rawData: JSON.stringify(record),
        },
        update: {
          fechaNacimiento: normalizeFecha(record.FECHA || ''),
          apellidos,
          nombres,
          pais: (record.PAIS || 'VENEZUELA').trim(),
          estado: (record.ESTADO || '').trim(),
          municipio: (record.MUNICIPIO || '').trim(),
          plan,
          rawData: JSON.stringify(record),
        },
      });
      count++;
    } catch {
      // skip errors
    }
  }
  return count;
}

export async function POST() {
  try {
    // Clear existing data
    await db.certification.deleteMany();
    await db.student.deleteMany();

    const dbPath = join(process.cwd(), 'db');

    let totalVigente = 0;
    try {
      totalVigente = await seedStudents(join(dbPath, 'students_bd.json'), 'vigente');
    } catch {
      // skip
    }

    let totalDerogado = 0;
    try {
      totalDerogado = await seedStudents(join(dbPath, 'students_bd2.json'), 'derogado');
    } catch {
      // skip
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos poblada exitosamente',
      totalStudents: totalVigente + totalDerogado,
      planVigente: totalVigente,
      planDerogado: totalDerogado,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, message: 'Error al poblar la base de datos' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const total = await db.student.count();
    const vigente = await db.student.count({ where: { plan: 'vigente' } });
    const derogado = await db.student.count({ where: { plan: 'derogado' } });
    const certifications = await db.certification.count();

    return NextResponse.json({
      totalStudents: total,
      planVigente: vigente,
      planDerogado: derogado,
      totalCertifications: certifications,
    });
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
