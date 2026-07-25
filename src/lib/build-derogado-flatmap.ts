// Convierte rawData de BD2 (plan derogado) a un mapa plano
// con las claves que los bindings del editor visual esperan:
//   rawData.INST.BASICA.1, rawData.NOTA.CA.1, rawData.EVAL.CA.1, etc.
//
// Maneja DOS formatos de entrada:
//   A) Formato estructurado (desde importDerogadoFromJSON): tiene arrays "instituciones", "calificaciones"
//   B) Formato crudo BD2 (desde seed.ts): tiene claves planas "9"-"38" para instituciones,
//      claves numéricas 39-293 para calificaciones, etc.
//
// IMPORTANTE: Al final se hace passthrough de TODOS los valores del rawData.
// Los asteriscos (*) son datos válidos y NUNCA se filtran.

// Códigos de materia CORRECTOS por año escolar (del Excel BD2 real)
const SUBJECT_CODES_BY_YEAR: Record<number, string[]> = {
  1: ['CA', 'IN', 'MA', 'EN', 'HV', 'EFC', 'GG', 'EA', 'EF', 'EPT'],
  2: ['CA', 'IN', 'MA', 'EPS', 'CB', 'HV', 'HU', 'EA', 'EF', 'ET'],
  3: ['CA', 'IN', 'MA', 'CB', 'FI', 'QU', 'HVCB', 'GV', 'EF', 'ET'],
  4: ['CA', 'MA', 'HC', 'IN', 'EF', 'FI', 'QU', 'BI', 'DT', 'FIL', 'IPM'],
  5: ['IN', 'EF', 'GEV', 'CA', 'MA', 'FI', 'QU', 'BI', 'CT', 'IPM'],
}

function formatFecha(val: unknown): string {
  if (!val) return ''
  const s = String(val).trim()
  if (!s) return ''

  // Already DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/')
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
  }

  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || s.includes('T')) {
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
      }
    } catch { /* ignore */ }
  }

  return s
}

/** Returns true only if the value is truly empty (null, undefined, or whitespace-only) */
function isBlank(val: unknown): boolean {
  if (!val) return true
  return String(val).trim() === ''
}

/** Clean a string value: trim — asterisks are valid data, never filter them */
function cleanVal(val: unknown): string {
  if (!val) return ''
  return String(val).trim()
}

/** Pad a month number to 2 digits */
function padMonth(val: string): string {
  const trimmed = val.trim()
  if (/^\d{1,2}$/.test(trimmed)) {
    return trimmed.padStart(2, '0')
  }
  return trimmed
}

export function buildDerogadoFlatMap(rawData: Record<string, any>): Record<string, string> {
  const map: Record<string, string> = {}

  // ═══════════════════════════════════════════════════════════════
  // PASSTHROUGH COMPLETO: copiar TODOS los valores del rawData.
  // Esto garantiza que NINGÚN campo se pierda (filas 1-84 y más).
  // Los asteriscos se preservan como datos válidos.
  // Los mapeos estructurados abajo sobreescriben estos cuando aplican.
  // ═══════════════════════════════════════════════════════════════
  for (const [key, val] of Object.entries(rawData)) {
    if (typeof val === 'string' || typeof val === 'number') {
      const strVal = String(val).trim()
      if (strVal !== '') {
        map[key] = strVal
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPEOS ESTRUCTURADOS (sobreescriben el passthrough arriba)
  // ═══════════════════════════════════════════════════════════════

  // 1. Datos personales (top-level keys que ya coinciden)
  const personalKeys = ['CEDULA', 'APELLIDOS', 'NOMBRES', 'PAIS', 'ESTADO', 'MUNICIPIO', 'LUGAR']
  for (const key of personalKeys) {
    if (rawData[key] !== undefined && rawData[key] !== null) {
      map[key] = String(rawData[key]).trim()
    }
  }

  // FECHA: convertir a DD/MM/AAAA
  if (rawData['FECHA'] !== undefined && rawData['FECHA'] !== null) {
    map['FECHA'] = formatFecha(rawData['FECHA'])
  }

  // 2. Instituciones — mapear a claves estructuradas INST.BASICA.N, LOCAL.BASICA.N, EF.BASICA.N
  const hasFlatInstKeys = Object.keys(rawData).some(k => { const n = parseInt(k); return n >= 8 && n <= 38 })
  const instituciones: Array<{ denominacion: string; localidad: string; ef: string }> = rawData['instituciones'] || []

  if (!hasFlatInstKeys && instituciones.length > 0) {
    // FORMATO A: Estructurado (array "instituciones")
    for (let i = 0; i < instituciones.length && i < 10; i++) {
      const inst = instituciones[i]
      const prefix = i < 5 ? 'BASICA' : 'DIV'
      const num = i < 5 ? i + 1 : i - 4
      if (inst.denominacion && !isBlank(inst.denominacion)) map[`INST.${prefix}.${num}`] = cleanVal(inst.denominacion)
      if (inst.localidad && !isBlank(inst.localidad)) map[`LOCAL.${prefix}.${num}`] = cleanVal(inst.localidad)
      if (inst.ef && !isBlank(inst.ef)) map[`EF.${prefix}.${num}`] = cleanVal(inst.ef)
    }
  } else {
    // FORMATO B: Crudo BD2 — claves "9","10","11" (inst1), "12","13","14" (inst2), etc.
    const bd2InstSlots = [
      ['9', '10', '11'], ['12', '13', '14'], ['15', '16', '17'],
      ['18', '19', '20'], ['21', '22', '23'], ['24', '25', '26'],
      ['27', '28', '29'], ['30', '31', '32'], ['33', '34', '35'],
      ['36', '37', '38'],
    ]
    for (let i = 0; i < bd2InstSlots.length; i++) {
      const [nameKey, locKey, efKey] = bd2InstSlots[i]
      const prefix = i < 5 ? 'BASICA' : 'DIV'
      const num = i < 5 ? i + 1 : i - 4
      // Mapear SIEMPRE que haya datos (incluyendo asteriscos)
      if (!isBlank(rawData[nameKey])) map[`INST.${prefix}.${num}`] = cleanVal(rawData[nameKey])
      if (!isBlank(rawData[locKey])) map[`LOCAL.${prefix}.${num}`] = cleanVal(rawData[locKey])
      if (!isBlank(rawData[efKey])) map[`EF.${prefix}.${num}`] = cleanVal(rawData[efKey])
    }
  }

  // 3. Calificaciones — mapear a claves planas
  const calificaciones: Array<{
    materia: string; abrev: string; anioEscolar: number;
    nota: string; eval: string; mes: string; anio: string; inst: string;
  }> = rawData['calificaciones'] || []

  if (calificaciones.length > 0) {
    // FORMATO A: Estructurado (array "calificaciones" con anioEscolar)
    const byYear: Record<number, typeof calificaciones> = {}
    for (const c of calificaciones) {
      const y = c.anioEscolar || 1
      if (!byYear[y]) byYear[y] = []
      byYear[y].push(c)
    }

    for (const [yearStr, grades] of Object.entries(byYear)) {
      const year = parseInt(yearStr)
      const codes = SUBJECT_CODES_BY_YEAR[year]
      if (!codes) continue

      for (let i = 0; i < grades.length && i < codes.length; i++) {
        const code = codes[i]
        const g = grades[i]
        const suffix = `.${code}.${year}`
        if (g.nota && g.nota !== '') map[`NOTA${suffix}`] = g.nota
        if (g.eval && g.eval !== '') map[`EVAL${suffix}`] = g.eval
        if (g.mes && g.mes !== '') map[`MES${suffix}`] = padMonth(String(g.mes))
        if (g.anio && g.anio !== '') map[`AÑO${suffix}`] = g.anio
        if (g.inst && g.inst !== '') map[`INST${suffix}`] = g.inst
      }
    }
  } else {
    // FORMATO B: Crudo BD2 — claves numéricas 39-293 en grupos de 5: nota, tipo, mes, año, inst
    const gradesPerYear = 10
    let key = 39
    let yearNum = 1
    let subjectIdx = 0
    while (key <= 293 && yearNum <= 5) {
      const codes = SUBJECT_CODES_BY_YEAR[yearNum]
      const code = codes?.[subjectIdx] || `M${subjectIdx + 1}`
      const suffix = `.${code}.${yearNum}`
      const nota = String(rawData[String(key)] || '').trim()
      if (nota !== '') map[`NOTA${suffix}`] = nota
      const ev = String(rawData[String(key + 1)] || '').trim()
      if (ev !== '') map[`EVAL${suffix}`] = ev
      const mes = String(rawData[String(key + 2)] || '').trim()
      if (mes !== '') map[`MES${suffix}`] = padMonth(mes)
      const anio = String(rawData[String(key + 3)] || '').trim()
      if (anio !== '') map[`AÑO${suffix}`] = anio
      const inst = String(rawData[String(key + 4)] || '').trim()
      if (inst !== '') map[`INST${suffix}`] = inst
      subjectIdx++
      key += 5
      if (subjectIdx >= gradesPerYear) {
        subjectIdx = 0
        yearNum++
      }
    }
  }

  // 4. Secciones
  const secciones = rawData['secciones'] || rawData['SECCION'] || {}
  for (let i = 1; i <= 5; i++) {
    const val = secciones[i] || secciones[String(i)] || rawData[`SECCION.${i}`]
    if (val && String(val).trim()) {
      map[`SECCION.${i}`] = String(val).trim()
    }
  }

  // 5. EPT (Educación para el Trabajo - especializaciones)
  const especializaciones: Array<{ anio: string; especialidad: string; periodo: string }> = rawData['especializaciones'] || []
  for (let i = 0; i < especializaciones.length && i < 12; i++) {
    const e = especializaciones[i]
    const num = i + 1
    if (e.anio && e.anio !== '') map[`EPT.GRADO.${num}`] = String(e.anio).trim()
    if (e.especialidad && e.especialidad !== '') map[`EPT.NOMBRE.${num}`] = String(e.especialidad).trim()
    if (e.periodo && e.periodo !== '') map[`EPT.HORAS.${num}`] = String(e.periodo).trim()
  }

  // 6. Observaciones Diversificado
  const obsDiv = rawData['observaciones'] || []
  for (let i = 0; i < obsDiv.length && i < 5; i++) {
    const val = String(obsDiv[i] || '').trim()
    if (val && val !== '') map[`OBS.DIV.L${i + 1}`] = val
  }

  // 7. Observaciones Básica
  for (let i = 1; i <= 5; i++) {
    const val = rawData[`OBS.BASICA.L${i}`]
    if (val && String(val).trim()) {
      map[`OBS.BASICA.L${i}`] = String(val).trim()
    }
  }

  // 8. Literales finales (estructurado o crudo claves 294-298)
  const literales = rawData['literalesFinales'] || []
  if (literales.length > 0) {
    for (let i = 0; i < literales.length && i < 5; i++) {
      const val = String(literales[i] || '').trim()
      if (val && val !== '') {
        map[`LITERAL.FINAL.${i + 1}`] = val
      }
    }
  } else {
    // Crudo BD2: claves 294-298
    for (let i = 0; i < 5; i++) {
      const val = rawData[String(294 + i)]
      if (val && !isBlank(val)) {
        map[`LITERAL.FINAL.${i + 1}`] = cleanVal(val)
      }
    }
  }

  // 9. Acta
  if (rawData['acta']) map['ACTA'] = String(rawData['acta']).trim()

  // 10. Validación título/notas
  if (rawData['SERIALTITULO']) map['SERIALTITULO'] = String(rawData['SERIALTITULO']).trim()
  if (rawData['FECHAEMISIONT']) map['FECHAEMISIONT'] = formatFecha(rawData['FECHAEMISIONT'])
  if (rawData['EGRESOAÑO']) map['EGRESOAÑO'] = String(rawData['EGRESOAÑO']).trim()
  if (rawData['FECHAEMISIONN']) map['FECHAEMISIONN'] = formatFecha(rawData['FECHAEMISIONN'])

  return map
}
