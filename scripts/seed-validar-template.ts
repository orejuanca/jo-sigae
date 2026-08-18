/**
 * Seed script: inserts the default VALIDACION DE NOTAS template
 * into the CertLayouts table for both plans (vigente and derogado).
 * 
 * Usage: npx tsx scripts/seed-validar-template.ts
 */
import { PrismaClient } from '@prisma/client'

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

interface SeedEntry {
  nombre: string
  plan: string
  dbUrl: string
}

async function seedOne(entry: SeedEntry) {
  const prisma = new PrismaClient({
    datasources: { db: { url: entry.dbUrl } },
  })

  const payload = {
    templateType: 'text-document',
    template: DEFAULT_TEMPLATE,
    meta: { plan: entry.plan },
  }

  // Check if already exists
  const existing = await prisma.certLayout.findFirst({
    where: { nombre: entry.nombre, activo: true },
  })

  if (existing) {
    console.log(`  Ya existe "${entry.nombre}" (id: ${existing.id}), actualizando datos...`)
    await prisma.certLayout.update({
      where: { id: existing.id },
      data: { datos: JSON.stringify(payload) },
    })
    console.log(`  Actualizado.`)
  } else {
    const created = await prisma.certLayout.create({
      data: {
        nombre: entry.nombre,
        datos: JSON.stringify(payload),
      },
    })
    console.log(`  Creado "${entry.nombre}" (id: ${created.id})`)
  }

  await prisma.$disconnect()
}

async function main() {
  const fs = await import('fs')
  const path = await import('path')
  const envPath = path.join(process.cwd(), '.env')

  let dbUrl = process.env.DATABASE_URL || ''
  let dbUrlDerogado = process.env.DATABASE_URL_DEROGADO || ''

  try {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('DATABASE_URL=')) {
        dbUrl = trimmed.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
      }
      if (trimmed.startsWith('DATABASE_URL_DEROGADO=')) {
        dbUrlDerogado = trimmed.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env not found, use env vars
  }

  if (!dbUrl) {
    console.error('ERROR: No se encontro DATABASE_URL en .env')
    process.exit(1)
  }

  const entries: SeedEntry[] = [
    { nombre: 'VALIDACION DE NOTAS (VIGENTE)', plan: 'vigente', dbUrl },
  ]

  if (dbUrlDerogado) {
    entries.push({ nombre: 'VALIDACION DE NOTAS (DEROGADO)', plan: 'derogado', dbUrl: dbUrlDerogado })
  } else {
    console.log('DATABASE_URL_DEROGADO no encontrada, solo se creara para plan vigente.')
  }

  console.log('Seeding VALIDACION DE NOTAS templates...\n')

  for (const entry of entries) {
    console.log(`Plan: ${entry.plan}`)
    await seedOne(entry)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
