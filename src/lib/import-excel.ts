// Importador directo de DATA_ALUMNOS.xlsx → datos estructurados para la BD
// Elimina el paso intermedio de claves numéricas frágiles
// Lee el Excel y produce directamente el formato structured_v1 que parse-rawdata.ts consume

import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { formatCedulaFinal } from './school-config'

// === MATERIAS POR AÑO (plan vigente) ===
// Mismas materias que en school-config pero con abreviaturas para rawData
const MATERIAS_VIGENTE: Record<number, { abrev: string; nombre: string }[]> = {
  1: [
    { abrev: 'CA', nombre: 'Castellano' },
    { abrev: 'IN', nombre: 'Inglés' },
    { abrev: 'MA', nombre: 'Matemáticas' },
    { abrev: 'EF', nombre: 'Educación Física' },
    { abrev: 'AP', nombre: 'Arte y Patrimonio' },
    { abrev: 'CN', nombre: 'Ciencias Naturales' },
    { abrev: 'GH', nombre: 'Geografía, Historia y Ciudadanía' },
  ],
  2: [
    { abrev: 'CA', nombre: 'Castellano' },
    { abrev: 'IN', nombre: 'Inglés' },
    { abrev: 'MA', nombre: 'Matemáticas' },
    { abrev: 'EF', nombre: 'Educación Física' },
    { abrev: 'AP', nombre: 'Arte y Patrimonio' },
    { abrev: 'CN', nombre: 'Ciencias Naturales' },
    { abrev: 'GH', nombre: 'Geografía, Historia y Ciudadanía' },
  ],
  3: [
    { abrev: 'CA', nombre: 'Castellano' },
    { abrev: 'IN', nombre: 'Inglés' },
    { abrev: 'MA', nombre: 'Matemáticas' },
    { abrev: 'EF', nombre: 'Educación Física' },
    { abrev: 'FI', nombre: 'Física' },
    { abrev: 'QU', nombre: 'Química' },
    { abrev: 'BI', nombre: 'Biología' },
    { abrev: 'GH', nombre: 'Geografía, Historia y Ciudadanía' },
    { abrev: 'FSN', nombre: 'Formación Soberanía Nacional' },
  ],
  4: [
    { abrev: 'CA', nombre: 'Castellano' },
    { abrev: 'IN', nombre: 'Inglés' },
    { abrev: 'MA', nombre: 'Matemáticas' },
    { abrev: 'EF', nombre: 'Educación Física' },
    { abrev: 'FI', nombre: 'Física' },
    { abrev: 'QU', nombre: 'Química' },
    { abrev: 'BI', nombre: 'Biología' },
    { abrev: 'GH', nombre: 'Geografía, Historia y Ciudadanía' },
    { abrev: 'FSN', nombre: 'Formación Soberanía Nacional' },
  ],
  5: [
    { abrev: 'CA', nombre: 'Castellano' },
    { abrev: 'IN', nombre: 'Inglés' },
    { abrev: 'MA', nombre: 'Matemáticas' },
    { abrev: 'EF', nombre: 'Educación Física' },
    { abrev: 'FI', nombre: 'Física' },
    { abrev: 'QU', nombre: 'Química' },
    { abrev: 'BI', nombre: 'Biología' },
    { abrev: 'CT', nombre: 'Ciencias de la Tierra' },
    { abrev: 'GH', nombre: 'Geografía, Historia y Ciudadanía' },
  ],
}

// Materias por año (plan derogado)
const MATERIAS_DEROGADO = [
  { abrev: 'CA', nombre: 'Castellano y Literatura' },
  { abrev: 'IN', nombre: 'Inglés' },
  { abrev: 'MA', nombre: 'Matemáticas' },
  { abrev: 'HV', nombre: 'Historia de Venezuela' },
  { abrev: 'GV', nombre: 'Geografía de Venezuela' },
  { abrev: 'CB', nombre: 'Ciencias Biológicas' },
  { abrev: 'FI', nombre: 'Física' },
  { abrev: 'QU', nombre: 'Química' },
  { abrev: 'EF', nombre: 'Educación Física' },
  { abrev: 'ET', nombre: 'Educación para el Trabajo' },
]

// === ESTRUCTURA DE COLUMNAS DEL EXCEL ===
// Basado en DATA_ALUMNOS.xlsx con 261 columnas
// Cols 1-7 (índice 0-6): Datos del alumno
// Cols 8-22 (índice 7-21): 5 instituciones × 3 campos (denominación, localidad, EF)
// Cols 23-227 (índice 22-226): Calificaciones, grupos de 5 (nota, eval, mes, año, inst)
//   Año 1: 7 materias → cols 23-57 (grupos 0-6)
//   Año 2: 7 materias → cols 58-92 (grupos 7-13)
//   Año 3: 9 materias → cols 93-137 (grupos 14-22)
//   Año 4: 9 materias → cols 138-182 (grupos 23-31)
//   Año 5: 9 materias → cols 183-227 (grupos 32-40)
// Cols 228-232 (índice 227-231): Orientación y Convivencia (5 años)
// Cols 233-237 (índice 232-236): Grupos - descripción (5 años)
// Cols 238-242 (índice 237-241): Grupos - literal (5 años)
// Cols 243-244 (índice 242-243): Observaciones líneas 1-2
// Cols 245-247 (índice 244-246): Observaciones líneas 3-5 (texto continuo)
// Cols 248-252 (índice 247-251): Literales finales (A-E por año)
// Cols 253-255 (índice 252-254): Acta (número, fecha, año)
// Col 256 (índice 255): Título - fecha expedición
// Cols 257-261 (índice 256-260): Título serial / datos adicionales

// Límites de materias por año para el plan vigente
const YEAR_SUBJECT_COUNTS_VIGENTE = [7, 7, 9, 9, 9] // Total: 41 grupos de 5

// Límites de materias por año para el plan derogado
const YEAR_SUBJECT_COUNTS_DEROGADO = [10, 10, 10, 10, 10] // Total: 50 grupos de 5

// === HELPERS ===

function isAsterisk(val: unknown): boolean {
  if (!val) return true
  const v = String(val).trim()
  return v === '' || /^\*+$/.test(v) || /^\*\s+\*/.test(v)
}

function isValidGrade(val: unknown): boolean {
  if (!val) return false
  const v = String(val).trim()
  if (isAsterisk(v)) return false
  if (/^\d{1,2}$/.test(v)) {
    const n = parseInt(v, 10)
    return n >= 1 && n <= 20
  }
  return ['PE', 'IN', 'EX'].includes(v.toUpperCase())
}

function normalizeFecha(val: unknown): string {
  if (!val) return ''
  // Si es un objeto Date de Excel (número de serie)
  if (typeof val === 'number') {
    // xlsx ya convierte fechas según option cellDates
    return ''
  }
  const trimmed = String(val).trim()
  if (!trimmed) return ''

  // Ya en DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
  }

  // ISO format (de xlsx con cellDates)
  if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    try {
      const d = new Date(trimmed)
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
      }
    } catch { /* ignore */ }
  }

  return trimmed
}

function formatDateVal(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    const day = String(val.getDate()).padStart(2, '0')
    const month = String(val.getMonth() + 1).padStart(2, '0')
    const year = val.getFullYear()
    return `${day}/${month}/${year}`
  }
  return normalizeFecha(val)
}

function cleanStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

// === TIPOS ===

export interface ExcelStudentRecord {
  cedula: string
  fechaNacimiento: string
  apellidos: string
  nombres: string
  pais: string
  estado: string
  municipio: string
  rawData: string // JSON string con formato structured_v1
}

interface RawGrade {
  nota: string
  tipo: string
  mes: string
  anio: string
  inst: string
}

// === FUNCIÓN PRINCIPAL: LEER EXCEL Y PRODUCIR REGISTROS ESTRUCTURADOS ===

export function importExcelVigente(filePath: string): ExcelStudentRecord[] {
  // Usar readFileSync + XLSX.read para compatibilidad con Vercel serverless
  const fileBuffer = readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { cellDates: true, type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false })

  const records: ExcelStudentRecord[] = []

  for (const row of rows) {
    // Los valores vienen como strings con los encabezados del Excel
    // Encabezados cols 1-7: CEDULA, FECHA, APELLIDOS, NOMBRES, PAIS, ESTADO, MUNICIPIO
    // Encabezados cols 8-261: "8", "9", "10", ... "261"
    const values: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      values[key] = cleanStr(val)
    }

    // Extraer datos del alumno
    const cedula = formatCedulaFinal(values['CEDULA'] || '')
    if (!cedula) continue

    const apellidos = values['APELLIDOS'] || ''
    const nombres = values['NOMBRES'] || ''
    if (!apellidos && !nombres) continue

    const fechaRaw = values['FECHA'] || ''
    // La fecha puede venir como string ISO si cellDates=true
    const fecha = normalizeFecha(fechaRaw)
    const pais = values['PAIS'] || 'VENEZUELA'
    const estado = values['ESTADO'] || ''
    const municipio = values['MUNICIPIO'] || ''

    // Construir rawData estructurado directamente
    const structured = buildStructuredVigente(values)

    records.push({
      cedula,
      fechaNacimiento: fecha,
      apellidos,
      nombres,
      pais,
      estado,
      municipio,
      rawData: JSON.stringify(structured),
    })
  }

  return records
}

// === CONSTRUIR DATOS ESTRUCTURADOS (PLAN VIGENTE) ===

function buildStructuredVigente(values: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // 1. Datos del alumno
  result['CEDULA'] = values['CEDULA'] || ''
  result['FECHA'] = values['FECHA'] || ''
  result['APELLIDOS'] = values['APELLIDOS'] || ''
  result['NOMBRES'] = values['NOMBRES'] || ''
  result['PAIS'] = values['PAIS'] || 'VENEZUELA'
  result['ESTADO'] = values['ESTADO'] || ''
  result['MUNICIPIO'] = values['MUNICIPIO'] || ''

  // 2. Instituciones (cols 8-22, índice de Excel "8"-"22", 5 instituciones × 3 campos)
  const instituciones: { denominacion: string; localidad: string; ef: string }[] = []
  for (let i = 0; i < 5; i++) {
    const nombreKey = String(8 + (i * 3))      // 8, 11, 14, 17, 20
    const locKey = String(9 + (i * 3))         // 9, 12, 15, 18, 21
    const efKey = String(10 + (i * 3))         // 10, 13, 16, 19, 22
    const nombre = values[nombreKey]
    const localidad = values[locKey]
    const ef = values[efKey]
    if (nombre && !isAsterisk(nombre)) {
      instituciones.push({
        denominacion: String(nombre).replace(/^\*/, '').trim(),
        localidad: localidad && !isAsterisk(localidad) ? String(localidad).replace(/^\*/, '').trim() : '',
        ef: ef && !isAsterisk(ef) ? ef.trim() : '',
      })
    }
  }
  result['instituciones'] = instituciones

  // 3. Calificaciones (cols 23-227, grupos de 5: nota, eval, mes, anio, inst)
  const allGrades: RawGrade[] = []
  let colKey = 23
  while (colKey <= 227) {
    const notaRaw = values[String(colKey)]
    const tipoRaw = values[String(colKey + 1)]
    const mesRaw = values[String(colKey + 2)]
    const anioRaw = values[String(colKey + 3)]
    const instRaw = values[String(colKey + 4)]

    if (isValidGrade(notaRaw)) {
      allGrades.push({
        nota: String(notaRaw).trim(),
        tipo: String(tipoRaw || '').trim(),
        mes: String(mesRaw || '').trim(),
        anio: String(anioRaw || '').trim(),
        inst: String(instRaw || '').trim(),
      })
    }
    colKey += 5
  }

  // Agrupar por año escolar
  const gradesByYear: string[] = []
  const groups: Record<string, RawGrade[]> = {}
  for (const g of allGrades) {
    if (!g.anio) continue
    if (!groups[g.anio]) {
      groups[g.anio] = []
      gradesByYear.push(g.anio)
    }
    groups[g.anio].push(g)
  }

  // Asignar materias por año
  const calificaciones: {
    materia: string
    abrev: string
    anioEscolar: number
    nota: string
    eval: string
    mes: string
    anio: string
    inst: string
  }[] = []

  gradesByYear.forEach((year, yearIdx) => {
    if (yearIdx >= 5) return
    const grades = groups[year]
    const materias = MATERIAS_VIGENTE[yearIdx + 1] || []

    grades.forEach((g, sIdx) => {
      const m = materias[sIdx % materias.length]
      calificaciones.push({
        materia: m?.nombre || `Materia ${sIdx + 1}`,
        abrev: m?.abrev || `M${sIdx + 1}`,
        anioEscolar: yearIdx + 1,
        nota: g.nota,
        eval: g.tipo,
        mes: g.mes,
        anio: g.anio,
        inst: g.inst && !isAsterisk(g.inst) ? g.inst : '',
      })
    })
  })
  result['calificaciones'] = calificaciones

  // 4. Orientación y Convivencia (cols 228-232)
  const orientacion: { anio: string; literal: string }[] = []
  for (let i = 0; i < 5; i++) {
    const val = values[String(228 + i)]
    orientacion.push({
      anio: gradesByYear[i] || '',
      literal: val && !isAsterisk(val) ? val.trim() : '',
    })
  }
  result['orientacion'] = orientacion

  // 5. Grupos descripción (cols 233-237)
  // 6. Grupos literal (cols 238-242)
  const grupos: { anio: string; grupo: string; literal: string }[] = []
  for (let i = 0; i < 5; i++) {
    const grupoDesc = values[String(233 + i)]
    const grupoLiteral = values[String(238 + i)]
    grupos.push({
      anio: gradesByYear[i] || '',
      grupo: grupoDesc && !isAsterisk(grupoDesc) ? grupoDesc.trim() : '',
      literal: grupoLiteral && !isAsterisk(grupoLiteral) ? grupoLiteral.trim() : '',
    })
  }
  result['grupos'] = grupos

  // 7. Observaciones de Certificación (cols 243-244 = OBS.CERT.L1 y L2)
  //    Cols 245-247 son de otros formatos (OBS.NOTAS / OBS.BOLETA), NO se cargan aquí
  const observaciones: string[] = []
  for (let i = 243; i <= 244; i++) {
    const val = values[String(i)]
    if (val && !isAsterisk(val)) {
      observaciones.push(val.trim())
    }
  }
  result['observaciones'] = observaciones

  // 8. Literales finales (cols 248-252)
  const literales: string[] = []
  for (let i = 0; i < 5; i++) {
    const val = values[String(248 + i)]
    if (val && !isAsterisk(val)) {
      literales.push(val.trim())
    }
  }
  result['literalesFinales'] = literales

  // 9. Acta (cols 253-255)
  result['acta'] = values['253'] ? values['253'].trim() : ''
  // La fecha puede venir como objeto Date
  result['actaFecha'] = formatDateVal(values['254'])
  result['actaAnio'] = values['255'] ? String(values['255']).trim() : ''

  // 10. Título / Serial (cols 256+)
  const tituloExpedicion = values['256']
  if (tituloExpedicion && !isAsterisk(tituloExpedicion)) {
    result['tituloExpedicion'] = formatDateVal(tituloExpedicion)
  }

  // 11. Metadata
  result['_format'] = 'structured_v1'
  result['_plan'] = 'vigente'

  return result
}

// === IMPORTAR PLAN DEROGADO (desde JSON) ===
// El plan derogado viene del archivo students_bd2.json con una estructura diferente
// Esta función mantiene compatibilidad con el formato BD2 existente

export function importDerogadoFromJSON(records: Record<string, unknown>[]): ExcelStudentRecord[] {
  const result: ExcelStudentRecord[] = []

  for (const record of records) {
    const flat = record as Record<string, string>
    const cedula = formatCedulaFinal(flat['CEDULA'] || '')
    if (!cedula) continue

    const apellidos = (flat['APELLIDOS'] || '').trim()
    const nombres = (flat['NOMBRES'] || '').trim()
    if (!apellidos && !nombres) continue

    const structured = buildStructuredDerogado(flat)

    result.push({
      cedula,
      fechaNacimiento: normalizeFecha(flat['FECHA'] || ''),
      apellidos,
      nombres,
      pais: (flat['PAIS'] || 'VENEZUELA').trim(),
      estado: (flat['ESTADO'] || '').trim(),
      municipio: (flat['MUNICIPIO'] || '').trim(),
      rawData: JSON.stringify(structured),
    })
  }

  return result
}

function buildStructuredDerogado(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // 1. Datos del alumno
  const studentFields = ['CEDULA', 'FECHA', 'APELLIDOS', 'NOMBRES', 'PAIS', 'ESTADO', 'MUNICIPIO']
  for (const field of studentFields) {
    if (flat[field] !== undefined) {
      result[field] = flat[field]
    }
  }

  // 2. Instituciones BD2 (keys "9°"-"38", grupos de 3)
  const bd2InstSlots = [
    ['9°', '10', '11'], ['12', '13', '14'], ['15', '16', '17'],
    ['18', '19', '20'], ['21', '22', '23'], ['24', '25', '26'],
    ['27', '28', '29'], ['30', '31', '32'], ['33', '34', '35'],
    ['36', '37', '38'],
  ]
  const instituciones: { denominacion: string; localidad: string; ef: string }[] = []
  for (const [nameKey, locKey, efKey] of bd2InstSlots) {
    const nombre = flat[nameKey]
    const localidad = flat[locKey]
    const ef = flat[efKey]
    if (nombre && !isAsterisk(nombre)) {
      instituciones.push({
        denominacion: String(nombre).replace(/^\*/, '').trim(),
        localidad: localidad && !isAsterisk(localidad) ? String(localidad).replace(/^\*/, '').trim() : '',
        ef: ef && !isAsterisk(ef) ? String(ef).trim() : '',
      })
    }
  }
  result['instituciones'] = instituciones

  // 3. Calificaciones BD2 (keys 39-293, grupos de 5)
  const allGrades: RawGrade[] = []
  let key = 39
  while (key <= 293) {
    const notaRaw = flat[String(key)]
    const tipoRaw = flat[String(key + 1)]
    const mesRaw = flat[String(key + 2)]
    const anioRaw = flat[String(key + 3)]
    const instRaw = flat[String(key + 4)]

    if (isValidGrade(notaRaw)) {
      allGrades.push({
        nota: String(notaRaw).trim(),
        tipo: String(tipoRaw || '').trim(),
        mes: String(mesRaw || '').trim(),
        anio: String(anioRaw || '').trim(),
        inst: String(instRaw || '').trim(),
      })
    }
    key += 5
  }

  const gradesByYear: string[] = []
  const groups: Record<string, RawGrade[]> = {}
  for (const g of allGrades) {
    if (!g.anio) continue
    if (!groups[g.anio]) {
      groups[g.anio] = []
      gradesByYear.push(g.anio)
    }
    groups[g.anio].push(g)
  }

  const sortedYears = Object.keys(groups).sort()
  const calificaciones: {
    materia: string
    abrev: string
    anioEscolar: number
    nota: string
    eval: string
    mes: string
    anio: string
    inst: string
  }[] = []

  sortedYears.forEach((year, yearIdx) => {
    if (yearIdx >= 5) return
    const grades = groups[year]
    grades.forEach((g, sIdx) => {
      const m = MATERIAS_DEROGADO[sIdx % MATERIAS_DEROGADO.length]
      calificaciones.push({
        materia: m?.nombre || `Materia ${sIdx + 1}`,
        abrev: m?.abrev || `M${sIdx + 1}`,
        anioEscolar: yearIdx + 1,
        nota: g.nota,
        eval: g.tipo,
        mes: g.mes,
        anio: g.anio,
        inst: g.inst && !isAsterisk(g.inst) ? g.inst : '',
      })
    })
  })
  result['calificaciones'] = calificaciones

  // 4. Literales finales BD2 (keys 294-298)
  const literales: string[] = []
  for (let i = 0; i < 5; i++) {
    const val = flat[String(294 + i)]
    if (val && !isAsterisk(val)) {
      literales.push(String(val).trim())
    }
  }
  result['literalesFinales'] = literales

  // 5. Especializaciones BD2 (keys 299+, grupos de 3)
  const especializaciones: { anio: string; especialidad: string; periodo: string }[] = []
  let specKey = 299
  while (flat[String(specKey)] && !isAsterisk(flat[String(specKey)]) && specKey < 320) {
    const anio = flat[String(specKey)] || ''
    const esp = flat[String(specKey + 1)] || ''
    const periodo = flat[String(specKey + 2)] || ''
    if (!isAsterisk(anio) && !isAsterisk(esp)) {
      especializaciones.push({
        anio: String(anio).trim(),
        especialidad: String(esp).trim(),
        periodo: String(periodo).trim(),
      })
    }
    specKey += 3
  }
  result['especializaciones'] = especializaciones

  // 6. Grupos
  if (especializaciones.length > 0) {
    result['grupos'] = especializaciones.map(s => ({
      anio: s.anio,
      grupo: s.especialidad,
      literal: '',
    }))
  } else {
    result['grupos'] = []
  }

  // 7. Orientación
  result['orientacion'] = sortedYears.slice(0, 5).map(y => ({ anio: y, literal: '' }))

  // 8. Observaciones BD2 (key 339)
  const obs339 = flat['339']
  if (obs339 && !isAsterisk(obs339)) {
    result['observaciones'] = [String(obs339).trim()]
  } else {
    result['observaciones'] = []
  }

  // 9. Acta BD2
  let acta = ''
  for (let k = 335; k <= 340; k++) {
    const val = flat[String(k)]
    if (val && !isAsterisk(val) && String(val).trim().match(/^[A-Z]/i)) {
      acta = String(val).trim()
      break
    }
  }
  result['acta'] = acta

  // 10. Metadata
  result['_format'] = 'structured_v1'
  result['_plan'] = 'derogado'

  return result
}