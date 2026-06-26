// Parser para extraer datos de certificación desde rawData (BD vigente y BD2 derogado)
// Soporta dos formatos de rawData:
//   1. ESTRUCTURADO (nuevo): claves descriptivas + arrays anidados (_format: "structured_v1")
//   2. PLANO (legacy): claves numéricas ("23", "24", ...) — se parsea igual que antes

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
  instEduc: string // N° de institución educativa (1-5)
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
  return v === '' || /^\*+$/.test(v) || /^\*\s+\*/.test(v)
}

// Check if a nota value represents a valid grade
function isValidGrade(val: string | undefined): boolean {
  if (!val) return false
  const v = String(val).trim()
  if (isAsterisk(v)) return false
  if (/^\d{1,2}$/.test(v)) {
    const n = parseInt(v, 10)
    return n >= 1 && n <= 20
  }
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

// ============================================================
// PARSER PARA FORMATO ESTRUCTURADO (nuevo)
// ============================================================

interface StructuredGrade {
  materia: string
  abrev: string
  anioEscolar: number
  nota: string
  eval: string
  mes: string
  anio: string
  inst: string
}

function parseStructuredVigente(data: Record<string, unknown>): ParsedCertData {
  const result: ParsedCertData = {
    plan: 'vigente',
    acta: String(data['acta'] || '').trim(),
    actaFecha: formatDateVal(String(data['actaFecha'] || '')),
    actaAnio: String(data['actaAnio'] || '').trim(),
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

  // Instituciones
  const insts = data['instituciones'] as Array<{ denominacion: string; localidad: string; ef: string }> | undefined
  if (Array.isArray(insts)) {
    result.instituciones = insts.map((inst, i) => ({
      numero: i + 1,
      denominacion: inst.denominacion,
      localidad: inst.localidad,
      ef: inst.ef,
    }))
  }

  // Calificaciones — agrupar por anioEscolar
  const grades = data['calificaciones'] as StructuredGrade[] | undefined
  if (Array.isArray(grades)) {
    const gradesByYear: Record<number, StructuredGrade[]> = {}
    for (const g of grades) {
      const y = g.anioEscolar || 0
      if (!gradesByYear[y]) gradesByYear[y] = []
      gradesByYear[y].push(g)
    }

    const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']
    const sortedYears = Object.keys(gradesByYear).map(Number).sort((a, b) => a - b)

    sortedYears.forEach((yearNum, yearIdx) => {
      if (yearIdx >= 5) return
      const yearName = yearNames[yearIdx]
      const yearGrades = gradesByYear[yearNum]
      const planIdx = Math.min(yearIdx, planEMG.length - 1)
      const subjects = planEMG[planIdx].materias

      // Recoger años escolares únicos de las notas
      const aniosSet = new Set<string>()

      result.calificaciones[yearName] = yearGrades.map((g, sIdx) => {
        const literal = notaEnLetras(g.nota)
        const subjectIndex = sIdx % subjects.length
        const materia = subjects[subjectIndex]?.nombre || g.materia || `Materia ${sIdx + 1}`

        if (g.anio) aniosSet.add(g.anio)

        return {
          materia,
          numero: sIdx + 1,
          nota: g.nota,
          literal,
          tipoEvaluacion: g.eval || '',
          fechaMes: parseMes(g.mes),
          fechaAnio: g.anio,
          instEduc: g.inst && !isAsterisk(g.inst) ? g.inst : '',
        }
      })

      aniosSet.forEach(a => {
        if (!result.aniosEscolares.includes(a)) result.aniosEscolares.push(a)
      })
    })
  }

  // Orientación
  const orient = data['orientacion'] as Array<{ anio: string; literal: string }> | undefined
  if (Array.isArray(orient)) {
    result.orientacion = orient.map(o => ({
      anio: o.anio || '',
      literal: o.literal || '',
    }))
  }
  while (result.orientacion.length < 5) {
    result.orientacion.push({ anio: result.aniosEscolares[result.orientacion.length] || '', literal: '' })
  }

  // Grupos
  const grps = data['grupos'] as Array<{ anio: string; grupo: string; literal: string }> | undefined
  if (Array.isArray(grps)) {
    result.grupos = grps.map(g => ({
      anio: g.anio || '',
      grupo: g.grupo || '',
      literal: g.literal || '',
    }))
  }
  while (result.grupos.length < 5) {
    result.grupos.push({ anio: result.aniosEscolares[result.grupos.length] || '', grupo: '', literal: '' })
  }

  // Observaciones
  const obs = data['observaciones'] as string[] | undefined
  if (Array.isArray(obs)) {
    result.observaciones = obs.filter(o => o && o.trim())
  }
  result.observacionCompleta = result.observaciones.join(' ')

  // Literales finales
  const lits = data['literalesFinales'] as string[] | undefined
  if (Array.isArray(lits)) {
    result.literalesFinales = lits.filter(l => l && l.trim())
  }

  return result
}

function parseStructuredDerogado(data: Record<string, unknown>): ParsedCertData {
  const result: ParsedCertData = {
    plan: 'derogado',
    acta: String(data['acta'] || '').trim(),
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

  // Instituciones
  const insts = data['instituciones'] as Array<{ denominacion: string; localidad: string; ef: string }> | undefined
  if (Array.isArray(insts)) {
    result.instituciones = insts.map((inst, i) => ({
      numero: i + 1,
      denominacion: inst.denominacion,
      localidad: inst.localidad,
      ef: inst.ef,
    }))
  }

  // Calificaciones
  const grades = data['calificaciones'] as StructuredGrade[] | undefined
  if (Array.isArray(grades)) {
    const gradesByYear: Record<number, StructuredGrade[]> = {}
    for (const g of grades) {
      const y = g.anioEscolar || 0
      if (!gradesByYear[y]) gradesByYear[y] = []
      gradesByYear[y].push(g)
    }

    const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']
    const sortedYears = Object.keys(gradesByYear).map(Number).sort((a, b) => a - b)

    sortedYears.forEach((yearNum, yearIdx) => {
      if (yearIdx >= 5) return
      const yearName = yearNames[yearIdx]
      const yearGrades = gradesByYear[yearNum]
      const planIdx = Math.min(yearIdx, PLAN_DEROGADO.length - 1)
      const subjects = PLAN_DEROGADO[planIdx].materias

      const aniosSet = new Set<string>()

      result.calificaciones[yearName] = yearGrades.map((g, sIdx) => {
        const literal = notaEnLetras(g.nota)
        const subjectIndex = sIdx % subjects.length
        const materia = subjects[subjectIndex]?.nombre || g.materia || `Materia ${sIdx + 1}`

        if (g.anio) aniosSet.add(g.anio)

        return {
          materia,
          numero: sIdx + 1,
          nota: g.nota,
          literal,
          tipoEvaluacion: g.eval || '',
          fechaMes: parseMes(g.mes),
          fechaAnio: g.anio,
          instEduc: g.inst && !isAsterisk(g.inst) ? g.inst : '',
        }
      })

      aniosSet.forEach(a => {
        if (!result.aniosEscolares.includes(a)) result.aniosEscolares.push(a)
      })
    })
  }

  // Especializaciones
  const specs = data['especializaciones'] as Array<{ anio: string; especialidad: string; periodo: string }> | undefined
  if (Array.isArray(specs)) {
    result.especializaciones = specs
    result.grupos = specs.map(s => ({
      anio: s.anio,
      grupo: s.especialidad,
      literal: '',
    }))
  }

  // Orientación
  const orient = data['orientacion'] as Array<{ anio: string; literal: string }> | undefined
  if (Array.isArray(orient)) {
    result.orientacion = orient.map(o => ({ anio: o.anio || '', literal: o.literal || '' }))
  }
  while (result.orientacion.length < 5) {
    result.orientacion.push({ anio: result.aniosEscolares[result.orientacion.length] || '', literal: '' })
  }

  // Observaciones
  const obs = data['observaciones'] as string[] | undefined
  if (Array.isArray(obs)) {
    result.observaciones = obs.filter(o => o && o.trim())
  }
  result.observacionCompleta = result.observaciones.join(' ')

  // Literales finales
  const lits = data['literalesFinales'] as string[] | undefined
  if (Array.isArray(lits)) {
    result.literalesFinales = lits.filter(l => l && l.trim())
  }

  return result
}

// ============================================================
// PARSER LEGACY — FORMATO PLANO (claves numéricas)
// ============================================================

// === PARSER BD VIGENTE (LEGACY) ===
function parseBDRawDataLegacy(rawData: Record<string, string>): ParsedCertData {
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
    [8, 9, 10], [11, 12, 13], [14, 15, 16], [17, 18, 19], [20, 21, 22],
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

  // Map to planEMG year names and assign subjects
  const yearNames = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']

  gradesByYear.forEach((year, yearIdx) => {
    if (yearIdx >= 5) return
    const grades = gradeGroupsByYear[year]
    const planIdx = Math.min(yearIdx, planEMG.length - 1)
    const subjects = planEMG[planIdx].materias
    const yearName = yearNames[yearIdx]

    const calificaciones: ParsedCalificacion[] = grades.map((g, sIdx) => {
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
        instEduc: g.lapso && !isAsterisk(g.lapso) ? String(g.lapso).trim() : '',
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
      literal: val && val.trim() ? String(val).trim() : '',
    })
  }

  // ---- Grupos de Creación/Recreación/Producción - keys 233-242 ----
  for (let i = 0; i < 5; i++) {
    const grupoDesc = rawData[String(233 + i)]
    const grupoLiteral = rawData[String(238 + i)]
    result.grupos.push({
      anio: gradesByYear[i] || '',
      grupo: grupoDesc && grupoDesc.trim() ? String(grupoDesc).trim() : '',
      literal: grupoLiteral && grupoLiteral.trim() ? String(grupoLiteral).trim() : '',
    })
  }

  // ---- Observaciones - keys específicos por línea ----
  const obsKeys = ['243', '244', '260', '261']
  for (const key of obsKeys) {
    const obs = rawData[key]
    if (obs && !isAsterisk(obs)) {
      result.observaciones.push(String(obs).trim())
    }
  }
  result.observacionCompleta = result.observaciones.join(' ')

  // ---- Literales finales - keys 248-252 ----
  for (let i = 0; i < 5; i++) {
    const lit = rawData[String(248 + i)]
    if (lit && lit.trim()) {
      result.literalesFinales.push(String(lit).trim())
    }
  }

  // ---- Acta - keys 253+ ----
  result.acta = rawData['253'] ? rawData['253'].trim() : ''
  result.actaFecha = rawData['254'] ? formatDateVal(rawData['254']) : ''
  result.actaAnio = rawData['255'] ? rawData['255'].trim() : ''

  return result
}

// === PARSER BD2 DEROGADO (LEGACY) ===
function parseBD2RawDataLegacy(rawData: Record<string, string>): ParsedCertData {
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
  const bd2InstSlots = [
    ['9°', '10', '11'], ['12', '13', '14'], ['15', '16', '17'],
    ['18', '19', '20'], ['21', '22', '23'], ['24', '25', '26'],
    ['27', '28', '29'], ['30', '31', '32'], ['33', '34', '35'],
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
    if (yearIdx >= 5) return
    const grades = gradeGroupsByYear[year]
    const planIdx = Math.min(yearIdx, PLAN_DEROGADO.length - 1)
    const subjects = PLAN_DEROGADO[planIdx].materias
    const yearName = yearNames[yearIdx]

    const calificaciones: ParsedCalificacion[] = grades.map((g, sIdx) => {
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
        instEduc: g.lapso && !isAsterisk(g.lapso) ? String(g.lapso).trim() : '',
      }
    })

    result.calificaciones[yearName] = calificaciones
    result.aniosEscolares.push(year)
  })

  // ---- Literales finales - keys 294-298 ----
  for (let i = 0; i < 5; i++) {
    const lit = rawData[String(294 + i)]
    if (lit && lit.trim()) {
      result.literalesFinales.push(String(lit).trim())
    }
  }

  // ---- Especializaciones - keys 299+ ----
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

  if (specs.length > 0) {
    result.grupos = specs.map((s) => ({
      anio: s.anio,
      grupo: s.especialidad,
      literal: '',
    }))
  }

  while (result.orientacion.length < 5) {
    result.orientacion.push({ anio: result.aniosEscolares[result.orientacion.length] || '', literal: '' })
  }

  // ---- Observaciones BD2 - key 339 ----
  const obs339 = rawData['339']
  if (obs339 && obs339.trim()) {
    result.observacionCompleta = String(obs339).trim()
    result.observaciones.push(String(obs339).trim())
  }

  // ---- Acta ----
  result.acta = findActaKey(rawData, 335, 340)

  return result
}

// ============================================================
// PARSER PRINCIPAL (detecta formato automáticamente)
// ============================================================

export function parseCertData(rawDataStr: string | null | undefined, plan: string | null | undefined): ParsedCertData | null {
  if (!rawDataStr) return null

  try {
    const rawData = typeof rawDataStr === 'string' ? JSON.parse(rawDataStr) : rawDataStr
    if (!rawData || typeof rawData !== 'object') return null

    // Detectar formato estructurado
    if (rawData._format === 'structured_v1') {
      const p = rawData._plan || plan
      if (p === 'derogado') return parseStructuredDerogado(rawData)
      return parseStructuredVigente(rawData)
    }

    // Detectar formato plano por claves numéricas
    const isBD2 = rawData['9°'] !== undefined || (plan === 'derogado')
    const isBD = rawData['8'] !== undefined && !rawData['9°']

    if (isBD2) return parseBD2RawDataLegacy(rawData)
    if (isBD) return parseBDRawDataLegacy(rawData)

    // Fallback: buscar claves numéricas
    const numKeys = Object.keys(rawData).filter(k => {
      const n = parseInt(k)
      return !isNaN(n) && n >= 8 && n <= 50
    })

    if (numKeys.length > 0) return parseBDRawDataLegacy(rawData)
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
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${day}/${month}/${year}`
  }
  
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
    tipoEvaluacion: string; fechaMes: string; fechaAnio: string; instEduc: string
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
      instEduc: g.instEduc || '',
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
        instEduc: '',
      }))
    }
  })

  // Build institutions
  const instituciones: ParsedInstitucion[] = [...parsed.instituciones]
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
    fechaExpedicion: new Date().toISOString().split('T')[0],
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
    observacionesLines: (parsed.observaciones || []).slice(0, 4),
    promedioAcumulado: (() => {
      const allCalifs = Object.values(calificaciones).flat()
      const numericNotas = allCalifs
        .map(c => parseFloat(c.nota))
        .filter(n => !isNaN(n) && n > 0)
      if (numericNotas.length === 0) return ''
      const promedio = numericNotas.reduce((a, b) => a + b, 0) / numericNotas.length
      return promedio.toFixed(2)
    })(),
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