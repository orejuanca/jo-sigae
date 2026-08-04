const Database = require('better-sqlite3')
const XLSX = require('xlsx')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'db', 'custom.db')
const EXCEL_PATH = path.join(__dirname, '..', 'upload', 'Base de Datos plan derogado.xlsx')

const db = new Database(DB_PATH)

// Verificar que la tabla existe
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='PlanDerogado'").all()
if (tables.length === 0) {
  console.error('ERROR: La tabla PlanDerogado no existe. Corre: npx prisma db push')
  process.exit(1)
}

// Leer Excel
console.log('Leyendo Excel...')
const workbook = XLSX.readFile(EXCEL_PATH)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
console.log(`Filas leídas: ${rows.length}`)

// Limpiar tabla
const del = db.prepare('DELETE FROM PlanDerogado').run()
console.log(`Eliminados: ${del.changes} registros existentes`)

// Insertar
const insert = db.prepare(`
  INSERT INTO PlanDerogado (id, cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData, createdAt, updatedAt)
  VALUES (@id, @cedula, @apellidos, @nombres, @fechaNacimiento, @pais, @estado, @municipio, @rawData, datetime('now'), datetime('now'))
`)

let inserted = 0
let omitted = 0

const insertMany = db.transaction((rows) => {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cedula = String(row.CEDULA || '').trim()
    if (!cedula) { omitted++; continue }

    const id = `pd_${String(i + 1).padStart(6, '0')}`

    // Campos del alumno
    const apellidos = String(row.APELLIDOS || '').trim()
    const nombres = String(row.NOMBRES || '').trim()
    let fechaNacimiento = row.FECHA
    if (fechaNacimiento instanceof Date) {
      fechaNacimiento = fechaNacimiento.toISOString().split('T')[0]
    } else {
      fechaNacimiento = String(fechaNacimiento || '').trim()
    }
    const pais = String(row.PAIS || 'VENEZUELA').trim()
    const estado = String(row.ESTADO || '').trim()
    const municipio = String(row.MUNICIPIO || '').trim()

    // rawData: TODAS las columnas como JSON
    const rawData = {}
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        rawData[key] = ''
      } else if (value instanceof Date) {
        rawData[key] = value.toISOString().split('T')[0]
      } else {
        rawData[key] = String(value).trim()
      }
    }

    insert.run({
      id, cedula, apellidos, nombres, fechaNacimiento,
      pais, estado, municipio,
      rawData: JSON.stringify(rawData),
    })
    inserted++
  }
})

insertMany(rows)

console.log(`\nRESULTADO:`)
console.log(`  Insertados: ${inserted}`)
console.log(`  Omitidos (sin cédula): ${omitted}`)

db.close()