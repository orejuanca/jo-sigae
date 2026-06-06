import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const filePath = path.resolve(__dirname, '../data/students.json')
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    console.error('Place your students.json file in the /data directory.')
    process.exit(1)
  }
  
  const rawData = fs.readFileSync(filePath, 'utf-8')
  const students: Array<{
    cedula: string
    fechaNacimiento: string
    apellidos: string
    nombres: string
    pais: string
  }> = JSON.parse(rawData)

  console.log(`Found ${students.length} students in JSON file`)

  // Normalize fechaNacimiento to ISO format
  const normalized = students.map(s => {
    let fecha = s.fechaNacimiento || ''
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      const [day, month, year] = fecha.split('/')
      fecha = `${year}-${month}-${day}`
    }
    return {
      cedula: s.cedula.trim(),
      apellidos: s.apellidos.trim(),
      nombres: s.nombres.trim(),
      fechaNacimiento: fecha,
      pais: s.pais?.trim() || 'VENEZUELA',
    }
  })

  let totalInserted = 0
  let totalSkipped = 0

  for (const student of normalized) {
    try {
      await prisma.student.create({ data: student })
      totalInserted++
      if (totalInserted % 100 === 0) {
        process.stdout.write(`\rInserted: ${totalInserted} | Skipped: ${totalSkipped} | Progress: ${totalInserted + totalSkipped}/${normalized.length}`)
      }
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === 'P2002') {
        totalSkipped++
      } else {
        console.error(`\nError inserting ${student.cedula}:`, e)
      }
    }
  }

  const count = await prisma.student.count()
  console.log(`\n\nTotal inserted: ${totalInserted}`)
  console.log(`Total skipped (duplicates): ${totalSkipped}`)
  console.log(`Total students in DB: ${count}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
