import { parseCertData, parsedToCertData } from '../src/lib/parse-rawdata'
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // Verificar 100 BD vigente + todos los BD2 derogado
  const vigentes = await prisma.student.findMany({
    where: { plan: 'vigente' },
    select: { id: true, cedula: true, apellidos: true, nombres: true, rawData: true, plan: true },
    take: 100
  })
  const derogados = await prisma.student.findMany({
    where: { plan: 'derogado' },
    select: { id: true, cedula: true, apellidos: true, nombres: true, rawData: true, plan: true },
  })
  const students = [...vigentes, ...derogados]

  let errores = 0, gradosReales = 0, gradosAsterisco = 0, mesMalos = 0
  const years = ['Primer Año','Segundo Año','Tercer Año','Cuarto Año','Quinto Año']

  for (const s of students) {
    try {
      const parsed = parseCertData(s.rawData, s.plan)
      if (!parsed) { errores++; continue }
      const certData = parsedToCertData(parsed, s)
      for (const y of years) {
        const califs = certData.calificaciones[y]
        if (!califs || califs.length === 0) { errores++; continue }
        for (const c of califs) {
          if (c.nota === '*') {
            gradosAsterisco++
          } else if (c.nota && c.nota !== '') {
            gradosReales++
            if (!c.literal || c.literal === '') {
              console.log('SIN LITERAL:', s.cedula, y, c.materia, 'nota=', c.nota)
              errores++
            }
          }
          if (c.fechaMes && c.fechaMes.includes('0*')) {
            console.log('MES 0*:', s.cedula, y, c.materia, 'mes=', c.fechaMes)
            mesMalos++; errores++
          }
        }
      }
    } catch(e: any) {
      console.log('ERROR:', s.cedula, e.message)
      errores++
    }
  }

  console.log('')
  console.log(`=== VERIFICACION (${students.length} alumnos: 100 vigente + ${derogados.length} derogado) ===`)
  console.log('Grados con nota real:', gradosReales)
  console.log('Grados con asterisco:', gradosAsterisco)
  console.log('MES malos (0*):', mesMalos)
  console.log('Total errores:', errores)
  console.log(errores === 0 ? '✅ TODO BIEN - 0 errores' : '❌ HAY PROBLEMAS')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })