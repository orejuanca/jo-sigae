import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { importExcelVigente, importDerogadoFromJSON } from '@/lib/import-excel';
import { readFileSync } from 'fs';
import { join } from 'path';

async function seedFromExcel(records: Awaited<ReturnType<typeof importExcelVigente>>, plan: string) {
  let count = 0;
  for (const record of records) {
    if (!record.cedula) continue;
    const apellidos = record.apellidos.trim();
    const nombres = record.nombres.trim();
    if (!apellidos && !nombres) continue;

    try {
      await db.student.upsert({
        where: { cedula: record.cedula },
        create: {
          cedula: record.cedula,
          fechaNacimiento: record.fechaNacimiento,
          apellidos,
          nombres,
          pais: record.pais,
          estado: record.estado,
          municipio: record.municipio,
          plan,
          rawData: record.rawData,
        },
        update: {
          fechaNacimiento: record.fechaNacimiento,
          apellidos,
          nombres,
          pais: record.pais,
          estado: record.estado,
          municipio: record.municipio,
          plan,
          rawData: record.rawData,
        },
      });
      count++;
    } catch {
      // skip errors (duplicados, etc.)
    }
  }
  return count;
}

export async function POST() {
  try {
    // Clear existing data
    await db.certification.deleteMany();
    await db.student.deleteMany();

    let totalVigente = 0;
    let totalDerogado = 0;

    // 1. Importar plan VIGENTE directamente desde el Excel
    try {
      const excelPath = join(process.cwd(), 'upload', 'DATA_ALUMNOS.xlsx');
      const vigenteRecords = importExcelVigente(excelPath);
      totalVigente = await seedFromExcel(vigenteRecords, 'vigente');
    } catch (error) {
      console.error('Error importando Excel vigente:', error);
    }

    // 2. Importar plan DEROGADO desde JSON (mantiene compatibilidad)
    try {
      const bd2Path = join(process.cwd(), 'db', 'students_bd2.json');
      const rawData = readFileSync(bd2Path, 'utf-8');
      const bd2Records: Record<string, unknown>[] = JSON.parse(rawData);
      const derogadoRecords = importDerogadoFromJSON(bd2Records);
      totalDerogado = await seedFromExcel(derogadoRecords, 'derogado');
    } catch (error) {
      console.error('Error importando BD2 derogado:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos poblada exitosamente desde Excel',
      totalStudents: totalVigente + totalDerogado,
      planVigente: totalVigente,
      planDerogado: totalDerogado,
      source: 'DATA_ALUMNOS.xlsx (vigente) + students_bd2.json (derogado)',
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