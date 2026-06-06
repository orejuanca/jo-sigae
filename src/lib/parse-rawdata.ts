// Parser para extraer datos de certificación desde rawData (BD vigente y BD2 derogado)
// Los datos originales provienen del archivo .xlsm y se almacenan como JSON en Student.rawData

import { planEMG, notaToLiteral, schoolConfig, type PlanAnio, type MateriaAnio } from './school-config'

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

function isAsterisk(val: string | undefined): boolean {
  if (!val) return true
  const v = String(val).trim()
  return v === '' || v === '*' || v.startsWith('**') || v.startsWith('* *') || v.includes('****')
}

function cleanSchoolName(val: string): string {
  return String(val).replace(/^\*/, '').trim()
}

// === PARSER BD VIGENTE ===
export function parseBDRawData(rawData: Record<string, string>): ParsedCertData {
  const result: ParsedCertData = {
    plan: 'vigente',
    acta: rawData['253'] || '',
    actaFecha: rawData['254'] ? formatDateVal(rawData['254']) : '',
    actaAnio: rawData['255'] || '',
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

  // Instituciones (Sección IV) - keys 8-22, grupos de 3 (nombre, localidad, EF)
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

  // Calificaciones - keys 23 onwards, groups of 5
  // BD vigente: 7-7-8-9-10 subjects per year
  const subjectsPerYear = [7, 7, 8, 9, 10] // matched to planEMG
  const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']
  let currentKey = 23
  const allAnios: string[] = []

  for (let y = 0; y < 5; y++) {
    const numSubjects = subjectsPerYear[y]
    const grades: ParsedCalificacion[] = []
    let yearFound = ''

    for (let s = 0; s < numSubjects; s++) {
      const notaRaw = rawData[String(currentKey)]
      const tipoRaw = rawData[String(currentKey + 1)]
      const mesRaw = rawData[String(currentKey + 2)]
      const anioRaw = rawData[String(currentKey + 3)]
      // lapso = rawData[String(currentKey + 4)] // not displayed separately

      if (!notaRaw || isAsterisk(notaRaw)) {
        currentKey += 5
        continue
      }

      const notaStr = String(notaRaw).trim()
      const tipoStr = String(tipoRaw || '').trim()
      const mesStr = parseMes(String(mesRaw || '').trim())
      const anioStr = String(anioRaw || '').trim()

      if (!yearFound && anioStr) yearFound = anioStr

      // Calculate literal from numeric grade
      const numNota = parseFloat(notaStr)
      const literal = !isNaN(numNota) ? notaToLiteral(numNota) : ''

      // Map to subject name from planEMG
      const subjectIndex = s % planEMG[y].materias.length
      const materia = planEMG[y].materias[subjectIndex]?.nombre || `Materia ${s + 1}`

      grades.push({
        materia,
        numero: s + 1,
        nota: notaStr,
        literal,
        tipoEvaluacion: tipoStr || '',
        fechaMes: mesStr,
        fechaAnio: anioStr,
      })

      currentKey += 5
    }

    if (grades.length > 0) {
      result.calificaciones[yearNames[y]] = grades
      if (yearFound) {
        allAnios.push(yearFound)
        result.aniosEscolares.push(yearFound)
      }
    }
  }

  // Orientación y Convivencia - keys 228-232
  for (let i = 0; i < 5; i++) {
    const val = rawData[String(228 + i)]
    result.orientacion.push({
      anio: allAnios[i] || '',
      literal: val && !isAsterisk(val) ? String(val).trim() : '',
    })
  }

  // Grupos de Creación/Recreación/Producción - keys 233-242
  for (let i = 0; i < 5; i++) {
    const grupoDesc = rawData[String(233 + i)]
    const grupoLiteral = rawData[String(238 + i)]
    result.grupos.push({
      anio: allAnios[i] || '',
      grupo: grupoDesc && !isAsterisk(grupoDesc) ? String(grupoDesc).trim() : '',
      literal: grupoLiteral && !isAsterisk(grupoLiteral) ? String(grupoLiteral).trim() : '',
    })
  }

  // Observaciones - keys 243-247
  for (let i = 0; i < 5; i++) {
    const obs = rawData[String(243 + i)]
    if (obs && !isAsterisk(obs)) {
      result.observaciones.push(String(obs).trim())
    }
  }
  result.observacionCompleta = result.observaciones.join(' ')

  // Literales finales - keys 248-252
  for (let i = 0; i < 5; i++) {
    const lit = rawData[String(248 + i)]
    if (lit && !isAsterisk(lit)) {
      result.literalesFinales.push(String(lit).trim())
    }
  }

  return result
}

// === PARSER BD2 DEROGADO ===
export function parseBD2RawData(rawData: Record<string, string>): ParsedCertData {
  const result: ParsedCertData = {
    plan: 'derogado',
    acta: rawData['335'] || '',
    actaFecha: rawData['336'] ? formatDateVal(rawData['336']) : '',
    actaAnio: rawData['337'] || '',
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

  // Instituciones en BD2 - keys "9°"-"38"
  // Escuela 1: keys "9°", "10", "11"
  // Escuela 2: keys "12", "13", "14"
  // Escuela 3-5: keys 15-38 en grupos de 3 (but many are asterisks)
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

  // Calificaciones BD2 - start at key 39, groups of 5
  // Read until we hit asterisks
  const gradeGroups: Array<{ nota: string; tipo: string; mes: string; anio: string; lapso: string }> = []
  let currentKey = 39
  while (rawData[String(currentKey)] !== undefined && !isAsterisk(rawData[String(currentKey)])) {
    gradeGroups.push({
      nota: String(rawData[String(currentKey)] || '').trim(),
      tipo: String(rawData[String(currentKey + 1)] || '').trim(),
      mes: String(rawData[String(currentKey + 2)] || '').trim(),
      anio: String(rawData[String(currentKey + 3)] || '').trim(),
      lapso: String(rawData[String(currentKey + 4)] || '').trim(),
    })
    currentKey += 5
  }

  // Group grades by year (anio field)
  const byYear: Record<string, typeof gradeGroups> = {}
  gradeGroups.forEach(g => {
    if (!byYear[g.anio]) byYear[g.anio] = []
    byYear[g.anio].push(g)
  })

  // Sort years and assign to school years
  const sortedYears = Object.keys(byYear).sort()
  const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']

  sortedYears.forEach((year, yearIdx) => {
    if (yearIdx >= 5) return // Max 5 years
    const grades = byYear[year]
    const yearName = yearNames[yearIdx]
    const planIdx = Math.min(yearIdx, PLAN_DEROGADO.length - 1)
    const subjects = PLAN_DEROGADO[planIdx].materias

    const calificaciones: ParsedCalificacion[] = grades.map((g, sIdx) => {
      const numNota = parseFloat(g.nota)
      const literal = (!isNaN(numNota) && numNota > 0) ? notaToLiteral(numNota) : ''
      const subjectIndex = sIdx % subjects.length
      const materia = subjects[subjectIndex]?.nombre || `Materia ${sIdx + 1}`

      return {
        materia,
        numero: sIdx + 1,
        nota: g.nota === 'PE' ? 'PE' : g.nota,
        literal: g.nota === 'PE' ? 'PE' : literal,
        tipoEvaluacion: g.tipo || '',
        fechaMes: parseMes(g.mes),
        fechaAnio: g.anio,
      }
    })

    result.calificaciones[yearName] = calificaciones
    result.aniosEscolares.push(year)
  })

  // Literales finales - keys 294-298
  for (let i = 0; i < 5; i++) {
    const lit = rawData[String(294 + i)]
    if (lit && !isAsterisk(lit)) {
      result.literalesFinales.push(String(lit).trim())
    }
  }

  // Especializaciones - keys 299+ (year, specialization, period - repeating)
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
    result.grupos = specs.map((s, i) => ({
      anio: s.anio,
      grupo: s.especialidad,
      literal: '',
    }))
  }

  // Observaciones BD2 - key 339
  const obs339 = rawData['339']
  if (obs339 && !isAsterisk(obs339)) {
    result.observacionCompleta = String(obs339).trim()
    result.observaciones.push(String(obs339).trim())
  }

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

// Helper para formatear fechas
function formatDateVal(dateStr: string): string {
  if (!dateStr) return ''
  // Handle ISO format: "2018-07-19T00:00:00"
  if (dateStr.includes('T')) {
    try {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
      }
    } catch { /* ignore */ }
  }
  return dateStr
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
      tipoEvaluacion: g.tipoEvaluacion || 'EF',
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
        tipoEvaluacion: 'EF',
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
    fechaExpedicion: new Date().toLocaleDateString('es-VE'),
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
      fechaNacimiento: student.fechaNacimiento || '',
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
