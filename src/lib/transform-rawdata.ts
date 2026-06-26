// Transforma rawData de formato plano (claves numéricas) a formato estructurado (claves descriptivas)
// Se aplica al importar datos del Excel para que el rawData sea legible y robusto

// Abreviaturas de materias por posición dentro de cada año
// Basado en el plan EMG vigente y la estructura del Excel
const MATERIAS_BY_YEAR: Record<number, { abrev: string; nombre: string }[]> = {
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
    { abrev: 'FSN', nombre: 'Formación Soberanía Nacional' },
  ],
}

// Materias del plan derogado (10 materias fijas por año)
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

function isAsterisk(val: string | undefined): boolean {
  if (!val) return true
  const v = String(val).trim()
  return v === '' || /^\*+$/.test(v) || /^\*\s+\*/.test(v)
}

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

// Detecta si rawData tiene formato plano (claves numéricas) o ya es estructurado
export function isFlatRawData(rawData: Record<string, unknown>): boolean {
  // Si tiene la clave 'instituciones' como array, ya está transformado
  if (Array.isArray(rawData['instituciones'])) return false
  // Si tiene claves numéricas en el rango 8-50, es plano
  const numKeys = Object.keys(rawData).filter(k => {
    const n = parseInt(k)
    return !isNaN(n) && n >= 8 && n <= 50
  })
  return numKeys.length > 0
}

// Detecta si rawData es BD2 (derogado) por la presencia de claves como "9°"
export function isBD2Format(rawData: Record<string, unknown>): boolean {
  return rawData['9°'] !== undefined
}

/**
 * Transforma rawData de BD Vigente de formato plano a estructurado.
 *
 * Formato plano:  { "8": "UEN CREACIÓN", "9": "NUEVA CÚA", ..., "23": "10", "24": "F", ... }
 * Formato estructurado:  { "CEDULA": "...", "instituciones": [...], "calificaciones": [...], ... }
 */
export function transformBDVigente(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // 1. Copiar campos del alumno (A-G) - ya tienen nombre
  const studentFields = ['CEDULA', 'FECHA', 'APELLIDOS', 'NOMBRES', 'PAIS', 'ESTADO', 'MUNICIPIO']
  for (const field of studentFields) {
    if (flat[field] !== undefined) {
      result[field] = flat[field]
    }
  }

  // 2. Instituciones (cols 8-22, grupos de 3)
  const instituciones: { denominacion: string; localidad: string; ef: string }[] = []
  for (let i = 0; i < 5; i++) {
    const base = 8 + (i * 3)
    const nombre = flat[String(base)]
    const localidad = flat[String(base + 1)]
    const ef = flat[String(base + 2)]
    if (nombre && !isAsterisk(nombre)) {
      instituciones.push({
        denominacion: String(nombre).replace(/^\*/, '').trim(),
        localidad: localidad && !isAsterisk(localidad) ? String(localidad).replace(/^\*/, '').trim() : '',
        ef: ef && !isAsterisk(ef) ? String(ef).trim() : '',
      })
    }
  }
  result['instituciones'] = instituciones

  // 3. Calificaciones — agrupar por POSICIÓN FIJA (bloques por año)
  const YEAR_BLOCKS = [
    { yearNum: 1, startCol: 23, count: 7 },
    { yearNum: 2, startCol: 58, count: 7 },
    { yearNum: 3, startCol: 93, count: 8 },
    { yearNum: 4, startCol: 133, count: 9 },
    { yearNum: 5, startCol: 178, count: 10 },
  ]

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

  const aniosEscolares: string[] = []

  for (const block of YEAR_BLOCKS) {
    const materias = MATERIAS_BY_YEAR[block.yearNum] || []
    let firstAnio = ''
    for (let i = 0; i < block.count; i++) {
      const col = block.startCol + (i * 5)
      const notaRaw = flat[String(col)]
      const tipoRaw = flat[String(col + 1)]
      const mesRaw = flat[String(col + 2)]
      const anioRaw = flat[String(col + 3)]
      const instRaw = flat[String(col + 4)]

      const m = materias[i]
      const anio = String(anioRaw || '').trim()
      if (!firstAnio && anio) firstAnio = anio

      calificaciones.push({
        materia: m?.nombre || `Materia ${i + 1}`,
        abrev: m?.abrev || `M${i + 1}`,
        anioEscolar: block.yearNum,
        nota: isValidGrade(notaRaw) ? String(notaRaw).trim() : '',
        eval: String(tipoRaw || '').trim(),
        mes: String(mesRaw || '').trim(),
        anio,
        inst: String(instRaw || '').trim(),
      })
    }
    aniosEscolares.push(firstAnio)
  }
  result['calificaciones'] = calificaciones
  result['aniosEscolares'] = aniosEscolares

  // 4. Orientación y Convivencia (cols 228-232)
  const orientacion: { anio: string; literal: string }[] = []
  for (let i = 0; i < 5; i++) {
    const val = flat[String(228 + i)]
    orientacion.push({
      anio: aniosEscolares[i] || '',
      literal: val && val.trim() ? String(val).trim() : '',
    })
  }
  result['orientacion'] = orientacion

  // 5. Grupos de Creación/Recreación/Producción (cols 233-242)
  const grupos: { anio: string; grupo: string; literal: string }[] = []
  for (let i = 0; i < 5; i++) {
    const grupoDesc = flat[String(233 + i)]
    const grupoLiteral = flat[String(238 + i)]
    grupos.push({
      anio: aniosEscolares[i] || '',
      grupo: grupoDesc && grupoDesc.trim() ? String(grupoDesc).trim() : '',
      literal: grupoLiteral && grupoLiteral.trim() ? String(grupoLiteral).trim() : '',
    })
  }
  result['grupos'] = grupos

  // 6. Observaciones (cols 243, 244, 260, 261)
  // Los asteriscos son datos válidos (norma oficial), NO se filtran
  const obsKeys = ['243', '244', '260', '261']
  const observaciones: string[] = []
  for (const k of obsKeys) {
    const val = flat[k]
    if (val && val.trim()) {
      observaciones.push(String(val).trim())
    }
  }
  result['observaciones'] = observaciones

  // 7. Literales finales (cols 248-252)
  const literales: string[] = []
  for (let i = 0; i < 5; i++) {
    const val = flat[String(248 + i)]
    if (val && val.trim()) {
      literales.push(String(val).trim())
    }
  }
  result['literalesFinales'] = literales

  // 8. Acta (cols 253-255)
  result['acta'] = flat['253'] ? String(flat['253']).trim() : ''
  result['actaFecha'] = flat['254'] ? String(flat['254']).trim() : ''
  result['actaAnio'] = flat['255'] ? String(flat['255']).trim() : ''

  // 9. Sección/Título (cols 237-241) — preservar datos adicionales
  const seccion: string[] = []
  for (let i = 0; i < 5; i++) {
    const val = flat[String(237 + i)]
    if (val && !isAsterisk(val)) {
      seccion.push(String(val).trim())
    }
  }
  if (seccion.length > 0) result['seccion'] = seccion

  // 10. Título/Serial (cols 242-256 aprox) — preservar
  const tituloSerial = flat['242'] ? String(flat['242']).trim() : ''
  if (tituloSerial && tituloSerial.trim()) result['tituloSerial'] = tituloSerial

  const tituloExpedicion = flat['245'] ? String(flat['245']).trim() : ''
  if (tituloExpedicion && tituloExpedicion.trim()) result['tituloExpedicion'] = tituloExpedicion

  const tituloEgreso = flat['246'] ? String(flat['246']).trim() : ''
  if (tituloEgreso && tituloEgreso.trim()) result['tituloEgreso'] = tituloEgreso

  // 11. Metadata
  result['_format'] = 'structured_v1'
  result['_plan'] = 'vigente'

  return result
}

/**
 * Transforma rawData de BD2 Derogado de formato plano a estructurado.
 */
export function transformBDDerogado(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // 1. Copiar campos del alumno
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
  interface RawGrade {
    nota: string
    tipo: string
    mes: string
    anio: string
    inst: string
  }

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

  // Agrupar por año
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

  // 6. Grupos desde especializaciones (si hay)
  if (especializaciones.length > 0) {
    result['grupos'] = especializaciones.map(s => ({
      anio: s.anio,
      grupo: s.especialidad,
      literal: '',
    }))
  } else {
    result['grupos'] = []
  }

  // 7. Orientación (vacía para BD2, se llena con años escolares)
  result['orientacion'] = sortedYears.slice(0, 5).map(y => ({ anio: y, literal: '' }))

  // 8. Observaciones BD2 (key 339)
  const obs339 = flat['339']
  if (obs339 && obs339.trim()) {
    result['observaciones'] = [String(obs339).trim()]
  } else {
    result['observaciones'] = []
  }

  // 9. Acta BD2
  let acta = ''
  for (let k = 335; k <= 340; k++) {
    const val = flat[String(k)]
    if (val && val.trim().match(/^[A-Z\*]/i)) {
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

/**
 * Función principal: transforma rawData plano a estructurado, detectando el plan automáticamente.
 * Si ya está estructurado, lo devuelve tal cual.
 */
export function transformRawData(rawDataStr: string, plan?: string): string {
  try {
    const rawData = JSON.parse(rawDataStr)
    if (!rawData || typeof rawData !== 'object') return rawDataStr

    // Ya está transformado
    if (!isFlatRawData(rawData)) return rawDataStr

    const isBD2 = isBD2Format(rawData) || plan === 'derogado'
    const transformed = isBD2
      ? transformBDDerogado(rawData as Record<string, string>)
      : transformBDVigente(rawData as Record<string, string>)

    return JSON.stringify(transformed)
  } catch {
    return rawDataStr
  }
}