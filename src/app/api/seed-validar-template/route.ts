import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

const DEFAULT_TEMPLATE = {
  headerLines: [
    'REPÚBLICA BOLIVARIANA DE VENEZUELA',
    'MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN',
    '{{denominacion}}',
    '{{estado}} - {{municipio}}',
  ],
  bodyParagraphs: [
    'Validación de Notas',
    '',
    'Quien suscribe, {{director.apellidosNombres}}, C.I. {{director.cedula}}, en mi condición de Directora del Plantel {{denominacion}}, código {{od}}, hace constar que el(la) ciudadano(a):',
    '',
    '{{estudiante.apellidos}} {{estudiante.nombres}}',
    'C.I.: {{estudiante.cedula}}',
    '',
    'cursó y aprobó en esta institución las asignaturas correspondientes al {{planEstudio}}, según se detalla a continuación:',
  ],
  footerLines: [
    'Obteniendo un promedio acumulado de {{promedioAcumulado}} puntos.',
    '',
    'Las calificaciones aquí expresadas son fieles copia de los registros llevados en este plantel. Se expide a solicitud de la parte interesada, en {{lugar}}, a los {{fechaExpedicion}}.',
    '',
    '___________________________',
    '{{director.apellidosNombres}}',
    'C.I. {{director.cedula}}',
    'Directora',
    '',
    '___________________________',
    'Secretaria',
  ],
  pageSize: 'legal',
  showGradesTable: true,
  gradesTableTitle: 'RELACIÓN DE CALIFICACIONES',
}

/**
 * Endpoint temporal para crear el template VALIDACION DE NOTAS
 * en la tabla CertLayouts para ambos planes.
 * 
 * GET /api/seed-validar-template
 * 
 * Despues de usar, se puede eliminar este archivo.
 */
export async function GET(request: NextRequest) {
  const results: string[] = []
  const plans = ['vigente', 'derogado']

  for (const plan of plans) {
    try {
      const db = getDb(plan)
      const nombre = plan === 'derogado'
        ? 'VALIDACION DE NOTAS (DEROGADO)'
        : 'VALIDACION DE NOTAS (VIGENTE)'

      const payload = {
        templateType: 'text-document',
        template: DEFAULT_TEMPLATE,
        meta: { plan },
      }

      const existing = await db.certLayout.findFirst({
        where: { nombre, activo: true },
      })

      if (existing) {
        await db.certLayout.update({
          where: { id: existing.id },
          data: { datos: JSON.stringify(payload) },
        })
        results.push(`${plan}: actualizado (id: ${existing.id})`)
      } else {
        const created = await db.certLayout.create({
          data: { nombre, datos: JSON.stringify(payload) },
        })
        results.push(`${plan}: creado (id: ${created.id})`)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido'
      results.push(`${plan}: ERROR - ${msg}`)
    }
  }

  return NextResponse.json({ message: 'Seed completado', results })
}
