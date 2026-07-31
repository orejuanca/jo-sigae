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

/** Convierte una nota numérica a su literal en español
 *  "01" → "CERO UNO", "10" → "DIEZ", "20" → "VEINTE"
 *  "**" → "**", "*" → "*", "PE" → "PENDIENTE"
 */
function notaToLiteral(nota: string): string {
  const s = nota.trim().toUpperCase()
  if (!s) return ''
  // Asteriscos: se devuelven tal cual
  if (/^\*+$/.test(s)) return s
  // Textos especiales
  if (s === 'PE') return 'PENDIENTE'
  if (s === 'AP') return 'APROBADO'
  if (s === 'RP') return 'REPROBADO'
  if (s === 'EQ') return 'EQUIVALENTE'
  // Número: convertir a literal
  const num = parseInt(s, 10)
  if (isNaN(num) || num < 0 || num > 20) return s
  const LITERALES: Record<number, string> = {
    0: 'CERO', 1: 'UNO', 2: 'DOS', 3: 'TRES', 4: 'CUATRO',
    5: 'CINCO', 6: 'SEIS', 7: 'SIETE', 8: 'OCHO', 9: 'NUEVE',
    10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE',
    15: 'QUINCE', 16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO',
    19: 'DIECINUEVE', 20: 'VEINTE',
  }
  const literal = LITERALES[num]
  if (!literal) return s
  // Si la nota original tiene cero a la izquierda (01-09), prefijar con CERO
  if (/^0\d$/.test(s)) {
    return `CERO ${literal}`
  }
  return literal
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
  // Nota: BD2 usa claves con símbolo de grado ("9°") para la primera institución.
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
    // FORMATO B: Crudo BD2 — claves "9°" o "9","10","11" (inst1), etc.
    const bd2InstSlots = [
      ['9°', '9', '10', '11'], ['12', '13', '14'], ['15', '16', '17'],
      ['18', '19', '20'], ['21', '22', '23'], ['24', '25', '26'],
      ['27', '28', '29'], ['30', '31', '32'], ['33', '34', '35'],
      ['36', '37', '38'],
    ]
    for (let i = 0; i < bd2InstSlots.length; i++) {
      const slots = bd2InstSlots[i]
      // Primer slot tiene variante con ° ("9°") y sin ° ("9")
      const nameKey = i === 0 ? (rawData['9°'] ? '9°' : '9') : slots[0]
      const locKey = i === 0 ? slots[2] : slots[1]
      const efKey = i === 0 ? slots[3] : slots[2]
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
        if (g.nota && g.nota !== '') map[`LITERAL${suffix}`] = notaToLiteral(g.nota)
        if (g.eval && g.eval !== '') map[`EVAL${suffix}`] = g.eval
        if (g.mes && g.mes !== '') map[`MES${suffix}`] = padMonth(String(g.mes))
        if (g.anio && g.anio !== '') map[`AÑO${suffix}`] = g.anio
        if (g.inst && g.inst !== '') map[`INST${suffix}`] = g.inst
      }
    }
  } else {
    // FORMATO B: Crudo BD2 — claves numéricas 39-293 en grupos de 5: nota, tipo, mes, año, inst
    let key = 39
    let yearNum = 1
    let subjectIdx = 0
    while (key <= 293 && yearNum <= 5) {
      const codes = SUBJECT_CODES_BY_YEAR[yearNum]
      const code = codes?.[subjectIdx] || `M${subjectIdx + 1}`
      const suffix = `.${code}.${yearNum}`
      const nota = String(rawData[String(key)] || '').trim()
      if (nota !== '') map[`NOTA${suffix}`] = nota
      if (nota !== '') map[`LITERAL${suffix}`] = notaToLiteral(nota)
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
      const gradesThisYear = codes?.length || 10
      if (subjectIdx >= gradesThisYear) {
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
  if (especializaciones.length > 0) {
    // FORMATO A: Estructurado (array "especializaciones")
    for (let i = 0; i < especializaciones.length && i < 12; i++) {
      const e = especializaciones[i]
      const num = i + 1
      if (e.anio && e.anio !== '') map[`EPT.GRADO.${num}`] = String(e.anio).trim()
      if (e.especialidad && e.especialidad !== '') map[`EPT.NOMBRE.${num}`] = String(e.especialidad).trim()
      if (e.periodo && e.periodo !== '') map[`EPT.HORAS.${num}`] = String(e.periodo).trim()
    }
  } else {
    // FORMATO B: Crudo BD2 — claves 299+ en grupos de 3: [grado, nombre, horas]
    for (let i = 0; i < 12; i++) {
      const baseKey = 299 + (i * 3)
      const grado = rawData[String(baseKey)]
      const nombre = rawData[String(baseKey + 1)]
      const horas = rawData[String(baseKey + 2)]
      const num = i + 1
      if (!isBlank(grado)) map[`EPT.GRADO.${num}`] = cleanVal(grado)
      if (!isBlank(nombre)) map[`EPT.NOMBRE.${num}`] = cleanVal(nombre)
      if (!isBlank(horas)) map[`EPT.HORAS.${num}`] = cleanVal(horas)
    }
  }

  // 7. Observaciones
  //    Estructura BD2 después de EPT (299-334) y metadatos (335-338):
  //      335 = ACTA, 336 = FECHAEMISIONT, 337 = FECHAEMISIONN, 338 = EGRESOAÑO
  //      339-343 = OBS.BASICA.L1-L5
  //      344-348 = OBS.DIV.L1-L5
  const obsDiv = rawData['observaciones'] || []
  if (obsDiv.length > 0) {
    // FORMATO A: Estructurado (array "observaciones")
    for (let i = 0; i < obsDiv.length && i < 5; i++) {
      const val = String(obsDiv[i] || '').trim()
      if (val && val !== '') map[`OBS.DIV.L${i + 1}`] = val
    }
  } else if (hasFlatInstKeys) {
    // FORMATO B: Crudo BD2 — claves 339-343 → OBS.BASICA.L1-L5
    for (let i = 0; i < 5; i++) {
      const val = rawData[String(339 + i)]
      if (!isBlank(val)) map[`OBS.BASICA.L${i + 1}`] = cleanVal(val)
    }
    // Claves 344-348 → OBS.DIV.L1-L5
    for (let i = 0; i < 5; i++) {
      const val = rawData[String(344 + i)]
      if (!isBlank(val)) map[`OBS.DIV.L${i + 1}`] = cleanVal(val)
    }
  } else {
    // Sin observaciones estructuradas ni crudas, buscar claves nombradas
    for (let i = 1; i <= 5; i++) {
      const val = rawData[`OBS.BASICA.L${i}`]
      if (val && String(val).trim()) map[`OBS.BASICA.L${i}`] = String(val).trim()
      const valD = rawData[`OBS.DIV.L${i}`]
      if (valD && String(valD).trim()) map[`OBS.DIV.L${i}`] = String(valD).trim()
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

  // 9. Acta y metadatos BD2 (claves 335-338)
  //    335 = ACTA, 336 = FECHAEMISIONT, 337 = FECHAEMISIONN, 338 = EGRESOAÑO
  if (rawData['acta']) map['ACTA'] = String(rawData['acta']).trim()
  if (hasFlatInstKeys) {
    if (!isBlank(rawData['335'])) map['ACTA'] = cleanVal(rawData['335'])
    if (!isBlank(rawData['336'])) map['FECHAEMISIONT'] = formatFecha(rawData['336'])
    if (!isBlank(rawData['337'])) map['FECHAEMISIONN'] = formatFecha(rawData['337'])
    if (!isBlank(rawData['338'])) map['EGRESOAÑO'] = cleanVal(rawData['338'])
  }

  // 10. Validación título/notas (structured format overrides)
  if (rawData['SERIALTITULO']) map['SERIALTITULO'] = String(rawData['SERIALTITULO']).trim()
  if (rawData['FECHAEMISIONT'] && !hasFlatInstKeys) map['FECHAEMISIONT'] = formatFecha(rawData['FECHAEMISIONT'])
  if (rawData['EGRESOAÑO'] && !hasFlatInstKeys) map['EGRESOAÑO'] = String(rawData['EGRESOAÑO']).trim()
  if (rawData['FECHAEMISIONN'] && !hasFlatInstKeys) map['FECHAEMISIONN'] = formatFecha(rawData['FECHAEMISIONN'])

  // 11. Promedios Académicos — separar Básica (años 1-3) y Diversificado (años 4-5)
  //     Cada NOTA.* tiene formato NOTA.{codigo}.{año} → último segmento = año escolar
  function calcPromedio(years: number[]): string {
    let suma = 0
    let count = 0
    for (const [key, val] of Object.entries(map)) {
      if (key.startsWith('NOTA.')) {
        const parts = key.split('.')
        const year = parseInt(parts[parts.length - 1])
        if (years.includes(year)) {
          const num = parseFloat(val)
          if (!isNaN(num) && num >= 10 && num <= 20) {
            suma += num
            count++
          }
        }
      }
    }
    return count > 0 ? (suma / count).toFixed(2) : 'No Hay'
  }
  map['PROMEDIO.BASICA'] = calcPromedio([1, 2, 3])
  map['PROMEDIO.DIVERSIFICADO'] = calcPromedio([4, 5])

  return map
}
