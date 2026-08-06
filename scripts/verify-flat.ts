import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require' } }
})
async function main() {
  const students = await prisma.planDerogado.findMany({ select: { cedula: true, rawData: true }, take: 5 })
  for (const s of students) {
    const raw = JSON.parse(s.rawData as string)
    console.log(s.cedula, '→ SECCION.4=', JSON.stringify(raw['SECCION.4']), '| LITERAL.FINAL.4=', JSON.stringify(raw['LITERAL.FINAL.4']), '| FECHAEMISIONT=', JSON.stringify(raw['FECHAEMISIONT']))
  }
  // Count how many have SECCION.4 as flat key
  const all = await prisma.planDerogado.findMany({ select: { rawData: true } })
  let count = 0
  for (const s of all) { const r = JSON.parse(s.rawData as string); if ('SECCION.4' in r) count++ }
  console.log(`\nCon SECCION.4 plana: ${count}/${all.length}`)
  await prisma.$disconnect()
}
main()
