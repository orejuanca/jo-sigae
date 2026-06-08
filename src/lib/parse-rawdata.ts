// Parser para extraer datos de certificación desde rawData (BD vigente y BD2 derogado)
// Los datos originales provienen del archivo .xlsm y se almacenan como JSON en Student.rawData

import { planEMG, notaEnLetras, schoolConfig, type PlanAnio, type MateriaAnio } from './school-config'

// === INTERFACES ===

export interface ParsedInstitucion {
  numero: number
  denominacion: string
  localidad: string
  ef: string
}

export interface ParsedCalificacion {
  materia: string
  numero: number
  nota: string
  literal: string
  tipoEvaluacion: string // F=Final, R=Reprobado, M=Mejorada, PE=Pre-Militar
  fechaMes: string
  fechaAnio: string
}

export interface ParsedOrientacion {
  anio: string
  literal: string
}

export interface ParsedGrupo {
  anio: string
  grupo: string
  literal: string
}

export interface ParsedSpecialization {
  anio: string
  especialidad: string
  periodo: string
}

export interface ParsedCertData {
  // Metadatos
  plan: 'vigente' | 'derogado'
  acta: string
  actaFecha: string
  actaAnio: string

  // Instituciones (Sección IV)
  instituciones: ParsedInstitucion[]

  // Calificaciones por año (Sección V)
  calificaciones: Record<string, ParsedCalificacion[]>
  aniosEscolares: string[] // Los años escolares encontrados (ej: ['2014','2015',...])

  // Orientación y Convivencia
  orientacion: ParsedOrientacion[]

  // Participación en Grupos
  grupos: ParsedGrupo[]

  // Especializaciones (solo BD2)
  especializaciones: ParsedSpecialization[]

  // Observaciones
  observaciones: string[]
  observacionCompleta: string

  // Literales finales
  literalesFinales: string[]
}

// Materias del plan derogado (planes antiguos - diversificado)
const PLAN_DEROGADO: PlanAnio[] = [
  {
    anio: 'Primer Año',
    materias: [
      { nombre: 'Castellano y Literatura', numero: 1 },
      { nombre: 'Inglés', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Historia de Venezuela', numero: 4 },
      { nombre: 'Geografía de Venezuela', numero: 5 },
      { nombre: 'Ciencias Biológicas', numero: 6 },
      { nombre: 'Física', numero: 7 },
      { nombre: 'Química', numero: 8 },
      { nombre: 'Educación Física', numero: 9 },
      { nombre: 'Educación para el Trabajo', numero: 10 },
    ],
  },
  {
    anio: 'Segundo Año',
    materias: [
      { nombre: 'Castellano y Literatura', numero: 1 },
      { nombre: 'Inglés', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Historia de Venezuela', numero: 4 },
      { nombre: 'Geografía de Venezuela', numero: 5 },
      { nombre: 'Ciencias Biológicas', numero: 6 },
      { nombre: 'Física', numero: 7 },
      { nombre: 'Química', numero: 8 },
      { nombre: 'Educación Física', numero: 9 },
      { nombre: 'Educación para el Trabajo', numero: 10 },
    ],
  },
  {
    anio: 'Tercer Año',
    materias: [
      { nombre: 'Castellano y Literatura', numero: 1 },
      { nombre: 'Inglés', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Historia de Venezuela', numero: 4 },
      { nombre: 'Geografía de Venezuela', numero: 5 },
      { nombre: 'Ciencias Biológicas', numero: 6 },
      { nombre: 'Física', numero: 7 },
      { nombre: 'Química', numero: 8 },
      { nombre: 'Educación Física', numero: 9 },
      { nombre: 'Educación para el Trabajo', numero: 10 },
    ],
  },
  {
    anio: 'Cuarto Año',
    materias: [
      { nombre: 'Castellano y Literatura', numero: 1 },
      { nombre: 'Inglés', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Historia de Venezuela', numero: 4 },
      { nombre: 'Geografía de Venezuela', numero: 5 },
      { nombre: 'Ciencias Biológicas', numero: 6 },
      { nombre: 'Física', numero: 7 },
      { nombre: 'Química', numero: 8 },
      { nombre: 'Educación Física', numero: 9 },
      { nombre: 'Educación para el Trabajo', numero: 10 },
    ],
  },
  {
    anio: 'Quinto Año',
    materias: [
      { nombre: 'Castellano y Literatura', numero: 1 },
      { nombre: 'Inglés', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Historia de Venezuela', numero: 4 },
      { nombre: 'Geografía de Venezuela', numero: 5 },
      { nombre: 'Ciencias Biológicas', numero: 6 },
      { nombre: 'Física', numero: 7 },
      { nombre: 'Química', numero: 8 },
      { nombre: 'Educación Física', numero: 9 },
      { nombre: 'Educación para el Trabajo', numero: 10 },
    ],
  },
]

// Meses en español
const MESES: Record<string, string> = {
  '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06',
  '7': '07', '8': '08', '9': '09', '10': '10', '11': '11', '12': '12',
}

function parseMes(m: string): string {
  return MESES[m] || m.padStart(2, '0')
}

// Check if a value is an asterisk placeholder (empty slot in the spreadsheet)
function isAsterisk(val: string | undefined): boolean {
  if (!val) return true
  const v = String(val).trim()
  // Matches: *, **, ****, * *, * * * *, etc.
  return v === '' || /^\*+$/.test(v) || /^\*\s+\*/.test(v)
}

// Check if a nota value represents a valid grade
function isValidGrade(val: string | undefined): boolean {
  if (!val) return false
  const v = String(val).trim()
  if (isAsterisk(v)) return false
  // Numeric grades: 01-20 (with or without leading zero)
  if (/^\d{1,2}$/.test(v)) {
    const n = parseInt(v, 10)
    return n >= 1 && n <= 20
  }
  // Special grade types
  return ['PE', 'IN', 'EX'].includes(v.toUpperCase())
}

function cleanSchoolName(val: string): string {
  return String(val).replace(/^\*/, '').trim()
}

// Find the acta key by scanning backwards from the end of the data
function findActaKey(rawData: Record<string, string>, startSearch: number, endSearch: number): string {
  for (let k = endSearch; k >= startSearch; k--) {
    const val = rawData[String(k)]
    if (val && !isAsterisk(val)) {
      return val.trim()
    }
  }
  return ''
}

// === PARSER BD VIGENTE ===
export function parseBDRawData(rawData: Record<string, string>): ParsedCertData {
  const result: ParsedCertData = {
    plan: 'vigente',
    acta: '',
    actaFecha: '',
    actaAnio: '',
    instituciones: [],
    calificaciones: {},
    aniosEscolares: [],
    orientacion: [],
    grupos: [],
    especializaciones: [],
    observaciones: [],
    observacionCompleta: '',
    literalesFinales: [],
  }

  // ---- Instituciones (Sección IV) - keys 8-22, grupos de 3 (nombre, localidad, EF) ----
  const instSlots = [
    [8, 9, 10],
    [11, 12, 13],
    [14, 15, 16],
    [17, 18, 19],
    [20, 21, 22],
  ]

  instSlots.forEach(([nameKey, locKey, efKey], i) => {
    const nombre = rawData[String(nameKey)]
    const localidad = rawData[String(locKey)]
    const ef = rawData[String(efKey)]

    if (nombre && !isAsterisk(nombre)) {
      result.instituciones.push({
        numero: i + 1,
        denominacion: cleanSchoolName(nombre),
        localidad: cleanSchoolName(localidad || ''),
        ef: cleanSchoolName(ef || ''),
      })
    }
  })

  // ---- Calificaciones - keys 23 to 227, scan in groups of 5 ----
  // Strategy: scan ALL groups of 5 from key 23 to 227
  // Skip groups where the nota field is asterisks/invalid
  // Group valid grades by year to detect year boundaries
  // Then map grades to subjects from planEMG based on year index

  interface RawGrade {
    nota: string
    tipo: string
    mes: string
    anio: string
    lapso: string
  }

  const allValidGrades: RawGrade[] = []
  let key = 23
  while (key <= 227) {
    const notaRaw = rawData[String(key)]
    const tipoRaw = rawData[String(key + 1)]
    const mesRaw = rawData[String(key + 2)]
    const anioRaw = rawData[String(key + 3)]
    const lapsoRaw = rawData[String(key + 4)]

    if (isValidGrade(notaRaw)) {
      allValidGrades.push({
        nota: String(notaRaw).trim(),
        tipo: String(tipoRaw || '').trim(),
        mes: String(mesRaw || '').trim(),
        anio: String(anioRaw || '').trim(),
        lapso: String(lapsoRaw || '').trim(),
      })
    }
    // Always advance by 5 regardless of whether it was valid or asterisk
    key += 5
  }

  // Group grades by year (detecting year transitions)
  const gradesByYear: string[] = [] // the actual year values in order
  const gradeGroupsByYear: Record<string, RawGrade[]> = {}

  for (const grade of allValidGrades) {
    const year = grade.anio
    if (!year) continue
    if (!gradeGroupsByYear[year]) {
      gradeGroupsByYear[year] = []
      gradesByYear.push(year)
    }
    gradeGroupsByYear[year].push(grade)
  }

  // Map to planEMG year names and assign subjects
  const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']

  gradesByYear.forEach((year, yearIdx) => {
    if (yearIdx >= 5) return // Max 5 school years
    const grades = gradeGroupsByYear[year]
    const planIdx = Math.min(yearIdx, planEMG.length - 1)
    const subjects = planEMG[planIdx].materias
    const yearName = yearNames[yearIdx]

    const calificaciones: ParsedCalificacion[] = grades.map((g, sIdx) => {
      const numNota = parseFloat(g.nota)
      const literal = notaEnLetras(g.nota)
      const subjectIndex = sIdx % subjects.length
      const materia = subjects[subjectIndex]?.nombre || `Materia ${sIdx + 1}`

      return {
        materia,
        numero: sIdx + 1,
        nota: g.nota,
        literal,
        tipoEvaluacion: g.tipo || '',
        fechaMes: parseMes(g.mes),
        fechaAnio: g.anio,
      }
    })

    result.calificaciones[yearName] = calificaciones
    result.aniosEscolares.push(year)
  })

  // ---- Orientación y Convivencia - keys 228-232 ----
  for (let i = 0; i < 5; i++) {
    const val = rawData[String(228 + i)]
    result.orientacion.push({
      anio: gradesByYear[i] || '',
      literal: val && !isAsterisk(val) ? String(val).trim() : '',
    })
  }

  // ---- Grupos de Creación/Recreación/Producción - keys 233-242 ----
  for (let i = 0; i < 5; i++) {
    const grupoDesc = rawData[String(233 + i)]
    const grupoLiteral = rawData[String(238 + i)]
    result.grupos.push({
      anio: gradesByYear[i] || '',
      grupo: grupoDesc && !isAsterisk(grupoDesc) ? String(grupoDesc).trim() : '',
      literal: grupoLiteral && !isAsterisk(grupoLiteral) ? String(grupoLiteral).trim() : '',
    })
  }

  // ---- Observaciones - keys 243-247 ----
  for (let i = 0; i < 5; i++) {
    const obs = rawData[String(243 + i)]
    if (obs && !isAsterisk(obs)) {
      result.observaciones.push(String(obs).trim())
    }
  }
  result.observacionCompleta = result.observaciones.join(' ')

  // ---- Literales finales - keys 248-252 ----
  for (let i = 0; i < 5; i++) {
    const lit = rawData[String(248 + i)]
    if (lit && !isAsterisk(lit)) {
      result.literalesFinales.push(String(lit).trim())
    }
  }

  // ---- Acta - keys 253+ ----
  result.acta = rawData['253'] ? rawData['253'].trim() : ''
  result.actaFecha = rawData['254'] ? formatDateVal(rawData['254']) : ''
  result.actaAnio = rawData['255'] ? rawData['255'].trim() : ''

  return result
}

// === PARSER BD2 DEROGADO ===
export function parseBD2RawData(rawData: Record<string, string>): ParsedCertData {
  const result: ParsedCertData = {
    plan: 'derogado',
    acta: '',
    actaFecha: '',
    actaAnio: '',
    instituciones: [],
    calificaciones: {},
    aniosEscolares: [],
    orientacion: [],
    grupos: [],
    especializaciones: [],
    observaciones: [],
    observacionCompleta: '',
    literalesFinales: [],
  }

  // ---- Instituciones en BD2 - keys "9°"-"38" ----
  // Escuela 1: keys "9°", "10", "11"
  // Escuela 2: keys "12", "13", "14"
  // Escuela 3-10: keys 15-38 en grupos de 3 (but many are asterisks)
  const bd2InstSlots = [
    ['9°', '10', '11'],
    ['12', '13', '14'],
    ['15', '16', '17'],
    ['18', '19', '20'],
    ['21', '22', '23'],
    ['24', '25', '26'],
    ['27', '28', '29'],
    ['30', '31', '32'],
    ['33', '34', '35'],
    ['36', '37', '38'],
  ]

  let instNum = 1
  for (const [nameKey, locKey, efKey] of bd2InstSlots) {
    const nombre = rawData[nameKey]
    const localidad = rawData[locKey]
    const ef = rawData[efKey]

    if (nombre && !isAsterisk(nombre)) {
      result.instituciones.push({
        numero: instNum++,
        denominacion: cleanSchoolName(nombre),
        localidad: cleanSchoolName(localidad || ''),
        ef: cleanSchoolName(ef || ''),
      })
    }
  }

  // ---- Calificaciones BD2 - scan keys 39 to 293 in groups of 5 ----
  // Skip asterisk groups; collect valid grades; group by year
  interface RawGrade {
    nota: string
    tipo: string
    mes: string
    anio: string
    lapso: string
  }

  const allValidGrades: RawGrade[] = []
  let key = 39
  while (key <= 293) {
    const notaRaw = rawData[String(key)]
    const tipoRaw = rawData[String(key + 1)]
    const mesRaw = rawData[String(key + 2)]
    const anioRaw = rawData[String(key + 3)]
    const lapsoRaw = rawData[String(key + 4)]

    if (isValidGrade(notaRaw)) {
      allValidGrades.push({
        nota: String(notaRaw).trim(),
        tipo: String(tipoRaw || '').trim(),
        mes: String(mesRaw || '').trim(),
        anio: String(anioRaw || '').trim(),
        lapso: String(lapsoRaw || '').trim(),
      })
    }
    key += 5
  }

  // Group grades by year
  const gradesByYear: string[] = []
  const gradeGroupsByYear: Record<string, RawGrade[]> = {}

  for (const grade of allValidGrades) {
    const year = grade.anio
    if (!year) continue
    if (!gradeGroupsByYear[year]) {
      gradeGroupsByYear[year] = []
      gradesByYear.push(year)
    }
    gradeGroupsByYear[year].push(grade)
  }

  // Map to PLAN_DEROGADO year names
  const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']
  const sortedYears = Object.keys(gradeGroupsByYear).sort()

  sortedYears.forEach((year, yearIdx) => {
    if (yearIdx >= 5) return // Max 5 years
    const grades = gradeGroupsByYear[year]
    const planIdx = Math.min(yearIdx, PLAN_DEROGADO.length - 1)
    const subjects = PLAN_DEROGADO[planIdx].materias
    const yearName = yearNames[yearIdx]

    const calificaciones: ParsedCalificacion[] = grades.map((g, sIdx) => {
      const numNota = parseFloat(g.nota)
      const literal = notaEnLetras(g.nota)
      const subjectIndex = sIdx % subjects.length
      const materia = subjects[subjectIndex]?.nombre || `Materia ${sIdx + 1}`

      return {
        materia,
        numero: sIdx + 1,
        nota: g.nota,
        literal,
        tipoEvaluacion: g.tipo || '',
        fechaMes: parseMes(g.mes),
        fechaAnio: g.anio,
      }
    })

    result.calificaciones[yearName] = calificaciones
    result.aniosEscolares.push(year)
  })

  // ---- Literales finales - keys 294-298 ----
  for (let i = 0; i < 5; i++) {
    const lit = rawData[String(294 + i)]
    if (lit && !isAsterisk(lit)) {
      result.literalesFinales.push(String(lit).trim())
    }
  }

  // ---- Especializaciones - keys 299+ (year, specialization, period - repeating) ----
  let specKey = 299
  const specs: ParsedSpecialization[] = []
  while (rawData[String(specKey)] && !isAsterisk(rawData[String(specKey)]) && specKey < 320) {
    const anio = rawData[String(specKey)] || ''
    const esp = rawData[String(specKey + 1)] || ''
    const periodo = rawData[String(specKey + 2)] || ''
    if (!isAsterisk(anio) && !isAsterisk(esp)) {
      specs.push({ anio: String(anio).trim(), especialidad: String(esp).trim(), periodo: String(periodo).trim() })
    }
    specKey += 3
  }
  result.especializaciones = specs

  // If there are specialization groups, populate the "grupos" section with them
  if (specs.length > 0) {
    result.grupos = specs.map((s) => ({
      anio: s.anio,
      grupo: s.especialidad,
      literal: '',
    }))
  }

  // ---- Orientación - populate from aniosEscolares if empty ----
  while (result.orientacion.length < 5) {
    result.orientacion.push({ anio: result.aniosEscolares[result.orientacion.length] || '', literal: '' })
  }

  // ---- Observaciones BD2 - key 339 (or search for it) ----
  const obs339 = rawData['339']
  if (obs339 && !isAsterisk(obs339)) {
    result.observacionCompleta = String(obs339).trim()
    result.observaciones.push(String(obs339).trim())
  }

  // ---- Acta - find it ----
  result.acta = findActaKey(rawData, 335, 340)

  return result
}

// === MAIN PARSER (detects plan automatically) ===
export function parseCertData(rawDataStr: string | null | undefined, plan: string | null | undefined): ParsedCertData | null {
  if (!rawDataStr) return null

  try {
    const rawData = typeof rawDataStr === 'string' ? JSON.parse(rawDataStr) : rawDataStr
    if (!rawData || typeof rawData !== 'object') return null

    // Detect plan by key structure
    const isBD2 = rawData['9°'] !== undefined || (plan === 'derogado')
    const isBD = rawData['8'] !== undefined && !rawData['9°']

    if (isBD2) return parseBD2RawData(rawData)
    if (isBD) return parseBDRawData(rawData)

    // Fallback: try to detect by checking for numbered keys
    const numKeys = Object.keys(rawData).filter(k => {
      const n = parseInt(k)
      return !isNaN(n) && n >= 8 && n <= 50
    })

    if (numKeys.length > 0) return parseBDRawData(rawData)
    return null
  } catch {
    return null
  }
}

// Helper para formatear fechas a DD/MM/YYYY
function formatDateVal(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = String(dateStr).trim()
  if (!trimmed) return ''
  
  // Ya está en formato DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${day}/${month}/${year}`
  }
  
  // Handle ISO format: "2018-07-19T00:00:00" o "2001-10-29"
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

// Obtener fecha actual en formato DD/MM/YYYY
function currentDateDDMMYYYY(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

// Convert parsed data to the format expected by the certificaciones page
export function parsedToCertData(parsed: ParsedCertData, student: {
  cedula: string
  fechaNacimiento?: string | null
  apellidos: string
  nombres: string
  pais?: string | null
  estado?: string | null
  municipio?: string | null
}) {
  // Build calificaciones in the page format
  const calificaciones: Record<string, Array<{
    materia: string; numero: number; nota: string; literal: string;
    tipoEvaluacion: string; fechaMes: string; fechaAnio: string
  }>> = {}

  Object.entries(parsed.calificaciones).forEach(([yearName, grades]) => {
    calificaciones[yearName] = grades.map(g => ({
      materia: g.materia,
      numero: g.numero,
      nota: g.nota,
      literal: g.literal,
      tipoEvaluacion: g.tipoEvaluacion || '',
      fechaMes: g.fechaMes,
      fechaAnio: g.fechaAnio,
    }))
  })

  // Fill empty years if needed
  const planToUse = parsed.plan === 'derogado' ? PLAN_DEROGADO : planEMG
  planToUse.forEach(p => {
    if (!calificaciones[p.anio]) {
      calificaciones[p.anio] = p.materias.map(m => ({
        materia: m.nombre,
        numero: m.numero,
        nota: '',
        literal: '',
        tipoEvaluacion: '',
        fechaMes: '',
        fechaAnio: '',
      }))
    }
  })

  // Build institutions
  const instituciones: ParsedInstitucion[] = [...parsed.instituciones]
  // Pad to 5
  while (instituciones.length < 5) {
    instituciones.push({
      numero: instituciones.length + 1,
      denominacion: '',
      localidad: '',
      ef: '',
    })
  }

  // Orientación - pad to 5
  const orientacion = [...parsed.orientacion]
  while (orientacion.length < 5) {
    orientacion.push({ anio: '', literal: '' })
  }

  // Grupos - pad to 5
  const grupos = [...parsed.grupos]
  while (grupos.length < 5) {
    grupos.push({ anio: '', grupo: '', literal: '' })
  }

  return {
    lugar: schoolConfig.estado,
    fechaExpedicion: new Date().toISOString().split('T')[0], // YYYY-MM-DD para input type="date"
    planEstudio: parsed.plan === 'derogado'
      ? 'EDUCACIÓN MEDIA GENERAL (PLAN DEROGADO)'
      : schoolConfig.planEstudio,
    od: schoolConfig.od,
    denominacion: schoolConfig.nombreCompleto,
    direccion: schoolConfig.direccion,
    telefono: schoolConfig.telefono,
    municipio: schoolConfig.municipio,
    estado: schoolConfig.estado,
    cdcce: schoolConfig.cdcceEstado,
    estudiante: {
      cedula: student.cedula || '',
      fechaNacimiento: formatDateVal(student.fechaNacimiento || ''),
      apellidos: student.apellidos || '',
      nombres: student.nombres || '',
      pais: student.pais || 'VENEZUELA',
      estado: student.estado || '',
      municipio: student.municipio || '',
    },
    instituciones: instituciones.slice(0, 5),
    calificaciones,
    orientacion: orientacion.slice(0, 5),
    grupos: grupos.slice(0, 5),
    observaciones: parsed.observacionCompleta || '',
    promedioAcumulado: parsed.acta ? `Acta: ${parsed.acta}` : '',
    director: {
      apellidosNombres: schoolConfig.director.apellidosNombres,
      cedula: schoolConfig.director.cedula,
    },
    directorCdcce: {
      apellidosNombres: schoolConfig.directorCdcce.apellidosNombres,
      cedula: schoolConfig.directorCdcce.cedula,
    },
    acta: parsed.acta,
    actaFecha: parsed.actaFecha,
    aniosEscolares: parsed.aniosEscolares,
    planTipo: parsed.plan,
  }
}

export { PLAN_DEROGADO }
