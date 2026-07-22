// Convierte rawData estructurado de BD2 (plan derogado) a un mapa plano
// con las claves que los bindings del editor visual esperan:
//   rawData.INST.BASICA.1, rawData.NOTA.CA.1, rawData.EVAL.CA.1, etc.
//
// El rawData estructurado tiene arrays como calificaciones e instituciones,
// pero los bindings usan claves nombradas basadas en los códigos reales de materia.

// Códigos de materia CORRECTOS por año escolar (del Excel BD2 real)
// Cada código de 2-4 letras corresponde a una materia específica
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

export function buildDerogadoFlatMap(rawData: Record<string, any>): Record<string, string> {
  const map: Record<string, string> = {}

  // 1. Datos personales (top-level keys that already match)
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

  // 2. Instituciones
  const instituciones: Array<{ denominacion: string; localidad: string; ef: string }> = rawData['instituciones'] || []
  // Las primeras 5 van a BASICA (educación básica), las siguientes a DIV (diversificado)
  const basicaCount = Math.min(instituciones.length, 5)
  for (let i = 0; i < instituciones.length && i < 10; i++) {
    const inst = instituciones[i]
    const prefix = i < 5 ? 'BASICA' : 'DIV'
    const num = i < 5 ? i + 1 : i - 4
    if (inst.denominacion) map[`INST.${prefix}.${num}`] = inst.denominacion
    if (inst.localidad) map[`LOCAL.${prefix}.${num}`] = inst.localidad
    if (inst.ef) map[`EF.${prefix}.${num}`] = inst.ef
  }

  // 3. Calificaciones — mapear desde structured a claves planas
  const calificaciones: Array<{
    materia: string; abrev: string; anioEscolar: number;
    nota: string; eval: string; mes: string; anio: string; inst: string;
  }> = rawData['calificaciones'] || []

  if (calificaciones.length > 0) {
    // Agrupar por anioEscolar
    const byYear: Record<number, typeof calificaciones> = {}
    for (const c of calificaciones) {
      const y = c.anioEscolar || 1
      if (!byYear[y]) byYear[y] = []
      byYear[y].push(c)
    }

    // Para cada año, usar los códigos correctos de materia según posición
    for (const [yearStr, grades] of Object.entries(byYear)) {
      const year = parseInt(yearStr)
      const codes = SUBJECT_CODES_BY_YEAR[year]
      if (!codes) continue

      for (let i = 0; i < grades.length && i < codes.length; i++) {
        const code = codes[i]
        const g = grades[i]
        const suffix = `.${code}.${year}`

        if (g.nota && g.nota !== '' && g.nota !== '*') map[`NOTA${suffix}`] = g.nota
        if (g.eval && g.eval !== '' && g.eval !== '*') map[`EVAL${suffix}`] = g.eval
        if (g.mes && g.mes !== '' && g.mes !== '*') map[`MES${suffix}`] = g.mes
        if (g.anio && g.anio !== '' && g.anio !== '*') map[`AÑO${suffix}`] = g.anio
        if (g.inst && g.inst !== '' && g.inst !== '*') map[`INST${suffix}`] = g.inst
      }
    }
  } else {
    // Si no hay calificaciones estructuradas, intentar con formato plano (claves numéricas)
    // Claves numéricas 39-293 en grupos de 5: nota, tipo, mes, año, inst
    const flatGrades: { year: number; code: string; nota: string; eval: string; mes: string; anio: string; inst: string }[] = []
    // 10 materias por año, 5 campos cada una = 50 grupos por año
    const gradesPerYear = 10
    let key = 39
    let yearNum = 1
    let subjectIdx = 0
    while (key <= 293 && yearNum <= 5) {
      const codes = SUBJECT_CODES_BY_YEAR[yearNum]
      const code = codes?.[subjectIdx] || `M${subjectIdx + 1}`
      flatGrades.push({
        year: yearNum, code,
        nota: String(rawData[String(key)] || '').trim(),
        eval: String(rawData[String(key + 1)] || '').trim(),
        mes: String(rawData[String(key + 2)] || '').trim(),
        anio: String(rawData[String(key + 3)] || '').trim(),
        inst: String(rawData[String(key + 4)] || '').trim(),
      })
      subjectIdx++
      key += 5
      if (subjectIdx >= gradesPerYear) {
        subjectIdx = 0
        yearNum++
      }
    }
    for (const g of flatGrades) {
      if (!g.nota || g.nota === '' || g.nota === '*') continue
      const suffix = `.${g.code}.${g.year}`
      map[`NOTA${suffix}`] = g.nota
      if (g.eval && g.eval !== '*') map[`EVAL${suffix}`] = g.eval
      if (g.mes && g.mes !== '*') map[`MES${suffix}`] = g.mes
      if (g.anio && g.anio !== '*') map[`AÑO${suffix}`] = g.anio
      if (g.inst && g.inst !== '*') map[`INST${suffix}`] = g.inst
    }
  }

  // 4. Secciones
  const secciones = rawData['secciones'] || rawData['SECCION'] || {}
  for (let i = 1; i <= 5; i++) {
    const val = secciones[i] || secciones[String(i)] || rawData[`SECCION.${i}`]
    if (val && String(val).trim() && String(val).trim() !== '*') {
      map[`SECCION.${i}`] = String(val).trim()
    }
  }

  // 5. EPT (Educación para el Trabajo - especializaciones)
  const especializaciones: Array<{ anio: string; especialidad: string; periodo: string }> = rawData['especializaciones'] || []
  for (let i = 0; i < especializaciones.length && i < 12; i++) {
    const e = especializaciones[i]
    const num = i + 1
    if (e.anio && e.anio !== '*') map[`EPT.GRADO.${num}`] = String(e.anio).trim()
    if (e.especialidad && e.especialidad !== '*') map[`EPT.NOMBRE.${num}`] = String(e.especialidad).trim()
    if (e.periodo && e.periodo !== '*') map[`EPT.HORAS.${num}`] = String(e.periodo).trim()
  }

  // 6. Observaciones Diversificado
  const obsDiv = rawData['observaciones'] || []
  for (let i = 0; i < obsDiv.length && i < 5; i++) {
    const val = String(obsDiv[i] || '').trim()
    if (val && val !== '*') map[`OBS.DIV.L${i + 1}`] = val
  }

  // 7. Observaciones Básica (buscar en rawData plano si existen)
  for (let i = 1; i <= 5; i++) {
    const val = rawData[`OBS.BASICA.L${i}`]
    if (val && String(val).trim() && String(val).trim() !== '*') {
      map[`OBS.BASICA.L${i}`] = String(val).trim()
    }
  }

  // 8. Literales finales
  const literales = rawData['literalesFinales'] || []
  for (let i = 0; i < literales.length && i < 5; i++) {
    const val = String(literales[i] || '').trim()
    if (val && val !== '*') {
      map[`LITERAL.FINAL.${i + 1}`] = val
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