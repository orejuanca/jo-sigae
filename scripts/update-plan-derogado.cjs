// USO: node scripts/update-plan-derogado.cjs
const XLSX = require('xlsx')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const EXCEL_PATH = path.join(__dirname, '..', 'upload', 'Base de Datos plan derogado.xlsx')
console.log('=== Importacion Plan Derogado ===')
console.log('Excel:', EXCEL_PATH)
const fs = require('fs')
if (!fs.existsSync(EXCEL_PATH)) { console.error('ERROR: No se encontro el Excel:', EXCEL_PATH); process.exit(1) }
const prisma = new PrismaClient()
const wb = XLSX.readFile(EXCEL_PATH)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
const headers = rows[0]
console.log('Columnas:', headers.length)
console.log('Filas de datos:', rows.length - 1)
let insertados = 0, omitidos = 0, errores = 0
async function importar() {
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const cedula = String(row[0] || '').trim()
    if (!cedula) { omitidos++; continue }
    try {
      const rawDataObj = {}
      for (let c = 0; c < headers.length; c++) {
        const key = String(headers[c] || '').trim()
        if (key && c < row.length) { rawDataObj[key] = String(row[c] ?? '') }
      }
      const existing = await prisma.planDerogado.findUnique({ where: { cedula } })
      if (existing) { omitidos++; continue }
      await prisma.planDerogado.create({ data: { cedula, apellidos: String(rawDataObj.APELLIDOS||'').replace(/\*+$/,'').trim(), nombres: String(rawDataObj.NOMBRES||'').replace(/\*+$/,'').trim(), pais: String(rawDataObj.PAIS||'').replace(/\*+$/,'').trim(), estado: String(rawDataObj.ESTADO||'').replace(/\*+$/,'').trim(), municipio: String(rawDataObj.MUNICIPIO||'').replace(/\*+$/,'').trim(), rawData: JSON.stringify(rawDataObj) } })
      insertados++
      if (insertados % 50 === 0) console.log('  Progreso:', insertados, 'insertados...')
    } catch (err) {
      console.error('  ERROR fila', i + 1, err.message)
      errores++
    }
  }
}
importar().then(() => {
  console.log('Insertados:', insertados)
  console.log('Omitidos:', omitidos)
  console.log('Errores:', errores)
  console.log('=== Fin ===')
  prisma.$disconnect()
}).catch(err => { console.error('Error fatal:', err); prisma.$disconnect(); process.exit(1) })
