/**
 * DRY-RUN SCRIPT - NO MODIFICA NADA
 * 
 * Busca alumnos de BD (plan vigente) que tengan los textos a corregir
 * en el campo observaciones del rawData y reporta qué se cambiaría.
 * 
 * Cambio 1: "MEMO-" → "ME-" (en cualquier línea de observaciones)
 * Cambio 2: "RANDUM DE FECHA 17/11/2017" → "MORANDUM DE FECHA 17/11/2017"
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RawData {
  observaciones?: string[]
  [key: string]: unknown
}

async function main() {
  console.log('=== DRY-RUN: Reporte de cambios propuestos ===\n')
  console.log('NO se modificará ningún dato.\n')

  // Obtener todos los alumnos de BD vigente
  const students = await prisma.student.findMany({
    where: {
      plan: 'vigente'
    },
    select: {
      id: true,
      cedula: true,
      apellidos: true,
      nombres: true,
      rawData: true,
    },
    orderBy: [
      { apellidos: 'asc' },
      { nombres: 'asc' }
    ]
  })

  console.log(`Total alumnos BD vigente: ${students.length}\n`)

  let totalCambios1 = 0
  let totalCambios2 = 0
  const afectados: {
    cedula: string
    nombre: string
    cambio1?: { indice: number; antes: string; despues: string }
    cambio2?: { indice: number; antes: string; despues: string }
  }[] = []

  for (const student of students) {
    let rawData: RawData
    try {
      rawData = JSON.parse(student.rawData)
    } catch {
      console.log(`  ⚠️ ${student.cedula}: rawData no es JSON válido, saltando...`)
      continue
    }

    const obs = rawData.observaciones
    if (!Array.isArray(obs) || obs.length === 0) continue

    const cambios1: { indice: number; antes: string; despues: string }[] = []
    const cambios2: { indice: number; antes: string; despues: string }[] = []

    for (let i = 0; i < obs.length; i++) {
      const linea = obs[i]
      if (!linea || typeof linea !== 'string') continue

      // Cambio 1: "MEMO-" → "ME-"
      if (linea.includes('MEMO-')) {
        cambios1.push({
          indice: i,
          antes: linea,
          despues: linea.replace(/MEMO-/g, 'ME-')
        })
      }

      // Cambio 2: "RANDUM DE FECHA 17/11/2017" → "MORANDUM DE FECHA 17/11/2017"
      if (linea.includes('RANDUM DE FECHA 17/11/2017')) {
        cambios2.push({
          indice: i,
          antes: linea,
          despues: linea.replace('RANDUM DE FECHA 17/11/2017', 'MORANDUM DE FECHA 17/11/2017')
        })
      }
    }

    if (cambios1.length > 0 || cambios2.length > 0) {
      const entry = {
        cedula: student.cedula,
        nombre: `${student.apellidos}, ${student.nombres}`,
        cambio1: cambios1[0],
        cambio2: cambios2[0],
      }
      afectados.push(entry)
      totalCambios1 += cambios1.length
      totalCambios2 += cambios2.length

      console.log(`📋 ${student.cedula} — ${entry.nombre}`)
      if (cambios1[0]) {
        console.log(`   Cambio 1 (obs[${cambios1[0].indice}]):`)
        console.log(`     ANTES: "${cambios1[0].antes}"`)
        console.log(`     DESPUÉS: "${cambios1[0].despues}"`)
      }
      if (cambios2[0]) {
        console.log(`   Cambio 2 (obs[${cambios2[0].indice}]):`)
        console.log(`     ANTES: "${cambios2[0].antes}"`)
        console.log(`     DESPUÉS: "${cambios2[0].despues}"`)
      }
      console.log('')
    }
  }

  console.log('=== RESUMEN ===')
  console.log(`Alumnos afectados: ${afectados.length} de ${students.length}`)
  console.log(`Total de líneas a cambiar por "MEMO-" → "ME-": ${totalCambios1}`)
  console.log(`Total de líneas a cambiar por "RANDUM" → "MORANDUM": ${totalCambios2}`)
  console.log('')
  console.log('⚠️  Este fue un DRY-RUN. No se modificó nada en la base de datos.')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})