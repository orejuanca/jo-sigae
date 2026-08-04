import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata';

// GET /api/plan-vigente/[id]/cert-data — Certificación EMG desde PlanVigente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await prisma.planVigente.findUnique({ where: { id } });

    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado en Plan Derogado' }, { status: 404 });
    }

    if (!record.rawData || record.rawData === '{}' || record.rawData === '') {
      return NextResponse.json({
        error: 'El registro no tiene datos de calificaciones',
        studentId: record.id,
        cedula: record.cedula,
        reason: 'empty_rawData',
      }, { status: 404 });
    }

    // Parsear rawData — mismo parser que Student porque el formato es idéntico
        // Plan Derogado: rawDataFlat directo (sin parser especializado)
    let parsed = null;
    try { parsed = parseCertData(record.rawData, 'derogado'); } catch {};

    if (!parsed) {
      return NextResponse.json({
        error: 'No se pudieron extraer datos de calificaciones del rawData',
        studentId: record.id,
        cedula: record.cedula,
        reason: 'parse_error',
        rawDataLength: record.rawData.length,
      }, { status: 404 });
    }

    // Construir objeto student-compatible para parsedToCertData
    const studentLike = {
      id: record.id,
      cedula: record.cedula,
      apellidos: record.apellidos,
      nombres: record.nombres,
      fechaNacimiento: record.fechaNacimiento,
      pais: record.pais || 'VENEZUELA',
      estado: record.estado || '',
      municipio: record.municipio || '',
      plan: 'vigente' as const,
    };

    const certData = parsedToCertData(parsed, studentLike);
    const gradeCount = Object.values(certData.calificaciones).flat().filter(c => c.nota && c.nota !== '').length;

   return NextResponse.json({
      student: studentLike,
      rawDataFlat: JSON.parse(record.rawData || '{}'),
      parsed,
      certData: certData || null,
      gradeCount: gradeCount || 0,
    });
  } catch (error) {
    console.error('Error parsing cert data from PlanDerogado:', error);
    return NextResponse.json({ error: 'Error al procesar datos de calificaciones', details: String(error) }, { status: 500 });
  }
}
