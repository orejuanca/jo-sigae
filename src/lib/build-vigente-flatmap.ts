// Convierte rawData de Plan Vigente (formato structured_v1) a un mapa plano
// con las 261 claves que corresponden a las columnas del Excel original.
//
// Estructura de las 261 columnas del Excel vigente:
//   Cols 1-7:   Datos del alumno (CEDULA, FECHA, APELLIDOS, NOMBRES, PAIS, ESTADO, MUNICIPIO)
//   Cols 8-22:  5 instituciones x 3 campos (denominacion, localidad, EF)
//   Cols 23-227: Calificaciones, 41 materias x 5 campos (nota, eval, mes, anio, inst)
//     1ro: 7 materias, 2do: 7, 3ro: 8, 4to: 9, 5to: 10
//   Cols 228-232: Orientacion y Convivencia (5 anios)
//   Cols 233-237: PG.GRUPO - descripcion (5 anios)
//   Cols 238-242: PG.LITERAL - literal (5 anios)
//   Cols 243-244: OBS.CERT.L1, L2
//   Cols 245-247: OBS.NOTAS.L1, L2, L3
//   Cols 248-252: SECCION.1 a SECCION.5
//   Cols 253-255: TITULO.SERIAL, TITULO.EXPEDICION, TITULO.EGRESO
//   Col 256:     CERT.EXPEDICION
//   Cols 257-259: OBS.BOLETA.L1, L2, L3
//   Cols 260-261: OBS.CERT.L3, L4

// Materias por ano (plan vigente) — abreviaturas usadas en las claves planas
const MATERIAS_VIGENTE: Record<number, string[]> = {
  1: ['CA', 'IN', 'MA', 'EF', 'AP', 'CN', 'GH'],
  2: ['CA', 'IN', 'MA', 'EF', 'AP', 'CN', 'GH'],
  3: ['CA', 'IN', 'MA', 'EF', 'FI', 'QU', 'BI', 'GH'],
  4: ['CA', 'IN', 'MA', 'EF', 'FI', 'QU', 'BI', 'GH', 'FSN'],
  5: ['CA', 'IN', 'MA', 'EF', 'FI', 'QU', 'BI', 'CT', 'GH', 'FSN'],
}

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
  if (/^\*+$/.test(s)) return s
  if (s === 'PE') return 'PENDIENTE'
  if (s === 'AP') return 'APROBADO'
  if (s === 'RP') return 'REPROBADO'
  if (s === 'EQ') return 'EQUIVALENTE'
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
  if (/^0\d$/.test(s)) {
    return `CERO ${literal}`
  }
  return literal
}

function formatFecha(val: unknown): string {
  if (!val) return ''
  const s = String(val).trim()
  if (!s) return ''

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/')
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(s) || s.includes('T')) {
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() < 2100) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      }
    } catch { /* ignore */ }
  }

  return s
}

function padMonth(val: string): string {
  const trimmed = val.trim()
  if (/^\d{1,2}$/.test(trimmed)) {
    return trimmed.padStart(2, '0')
  }
  return trimmed
}

export function buildVigenteFlatMap(rawData: Record<string, any>): Record<string, string> {
  const map: Record<string, string> = {}

  // PASSTHROUGH: copiar TODOS los valores planos del rawData
  // Esto permite que funcione tanto con formato estructurado como plano
  for (const [key, val] of Object.entries(rawData)) {
    if (typeof val === 'string' || typeof val === 'number') {
      const strVal = String(val).trim()
      if (strVal !== '') map[key] = strVal
    }
  }

  // 1. Datos del alumno (cols 1-7)
  const studentFields = ['CEDULA', 'FECHA', 'APELLIDOS', 'NOMBRES', 'PAIS', 'ESTADO', 'MUNICIPIO']
  for (const field of studentFields) {
    const val = rawData[field]
    if (val !== undefined && val !== null) {
      map[field] = field === 'FECHA' ? formatFecha(val) : cleanVal(val)
    }
  }

  // 2. Instituciones (cols 8-22, 5 inst x 3 campos) -> INST.BASICA.N, LOCAL.BASICA.N, EF.BASICA.N
  const instituciones: Array<{ denominacion: string; localidad: string; ef: string }> = rawData['instituciones'] || []
  for (let i = 0; i < 5; i++) {
    const inst = instituciones[i]
    const num = i + 1
    if (inst?.denominacion) map[`INST.BASICA.${num}`] = cleanVal(inst.denominacion)
    if (inst?.localidad)   map[`LOCAL.BASICA.${num}`] = cleanVal(inst.localidad)
    if (inst?.ef)          map[`EF.BASICA.${num}`] = cleanVal(inst.ef)
  }

  // 3. Calificaciones (cols 23-227, 41 materias x 5 campos)
  //    -> NOTA.{ABREV}.{ANO}, EVAL.{ABREV}.{ANO}, MES.{ABREV}.{ANO}, AÑO.{ABREV}.{ANO}, INST.{ABREV}.{ANO}
  const calificaciones: Array<{
    abrev: string; anioEscolar: number;
    nota: string; eval: string; mes: string; anio: string; inst: string;
  }> = rawData['calificaciones'] || []

  for (const c of calificaciones) {
    const code = c.abrev || ''
    const year = c.anioEscolar || 1
    if (!code) continue
    if (c.nota && c.nota !== '') {
      map[`NOTA.${code}.${year}`] = c.nota
      map[`LITERAL.${code}.${year}`] = notaToLiteral(c.nota)
    }
    if (c.eval && c.eval !== '') map[`EVAL.${code}.${year}`] = c.eval
    if (c.mes  && c.mes  !== '') map[`MES.${code}.${year}`] = padMonth(c.mes)
    if (c.anio && c.anio !== '') map[`AÑO.${code}.${year}`] = c.anio
    if (c.inst && c.inst !== '') map[`INST.${code}.${year}`] = c.inst
  }

  // 4. Orientacion y Convivencia (cols 228-232) -> ORIENT.1 a ORIENT.5
  const orientacion: Array<{ anio: string; literal: string }> = rawData['orientacion'] || []
  for (let i = 0; i < 5; i++) {
    const entry = orientacion[i]
    if (entry?.literal) map[`ORIENT.${i + 1}`] = cleanVal(entry.literal)
  }

  // 5. PG.GRUPO - descripcion (cols 233-237) -> GRUPO.1 a GRUPO.5
  const grupos: Array<{ anio: string; grupo: string; literal: string }> = rawData['grupos'] || []
  for (let i = 0; i < 5; i++) {
    const entry = grupos[i]
    if (entry?.grupo) map[`GRUPO.${i + 1}`] = cleanVal(entry.grupo)
  }

  // 6. PG.LITERAL - literal (cols 238-242) -> LITERAL.FINAL.1 a LITERAL.FINAL.5
  const literales: string[] = rawData['literalesFinales'] || []
  for (let i = 0; i < 5; i++) {
    if (literales[i]) map[`LITERAL.FINAL.${i + 1}`] = cleanVal(literales[i])
  }

  // 7. OBS.CERT (cols 243-244 + 260-261) -> OBS.CERT.L1 a OBS.CERT.L4
  const observaciones: string[] = rawData['observaciones'] || []
  for (let i = 0; i < 4; i++) {
    if (observaciones[i]) map[`OBS.CERT.L${i + 1}`] = cleanVal(observaciones[i])
  }

  // 8. OBS.NOTAS (cols 245-247) -> OBS.NOTAS.L1 a OBS.NOTAS.L3
  const obsNotas: string[] = rawData['observacionesNotas'] || []
  for (let i = 0; i < 3; i++) {
    if (obsNotas[i]) map[`OBS.NOTAS.L${i + 1}`] = cleanVal(obsNotas[i])
  }

  // 9. OBS.BOLETA (cols 257-259) -> OBS.BOLETA.L1 a OBS.BOLETA.L3
  const obsBoleta: string[] = rawData['observacionesBoleta'] || []
  for (let i = 0; i < 3; i++) {
    if (obsBoleta[i]) map[`OBS.BOLETA.L${i + 1}`] = cleanVal(obsBoleta[i])
  }

  // 10. SECCION (cols 248-252) -> SECCION.1 a SECCION.5
  const secciones: string[] = rawData['secciones'] || []
  for (let i = 0; i < 5; i++) {
    if (secciones[i]) map[`SECCION.${i + 1}`] = cleanVal(secciones[i])
  }

  // 11. Titulo y Certificado (cols 253-256)
  //    TITULO.SERIAL, TITULO.EXPEDICION, TITULO.EGRESO, CERT.EXPEDICION
  if (rawData['acta'])            map['ACTA'] = cleanVal(rawData['acta'])
  if (rawData['tituloExpedicion']) map['TITULO.EXPEDICION'] = formatFecha(rawData['tituloExpedicion'])
  if (rawData['actaAnio'])        map['TITULO.EGRESO'] = cleanVal(rawData['actaAnio'])
  if (rawData['actaFecha'])       map['CERT.EXPEDICION'] = formatFecha(rawData['actaFecha'])

  // 12. Promedios Académicos — Básica (1ro-3ro) y Diversificado (4to-5to)
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
  map['PROMEDIO.TOTAL'] = calcPromedio([1, 2, 3, 4, 5])

  // Resolver numeros de plantel por materia a nombre, localidad y E.F.
  for (const [key, val] of Object.entries(map)) {
    if (!key.startsWith('INST.') || key.startsWith('INST.BASICA.')) continue
    const idx = parseInt(val) - 1
    if (isNaN(idx) || idx < 0) continue
    const parts = key.split('.')
    const year = parseInt(parts[parts.length - 1])
    if (isNaN(year)) continue
    const suffix = key.substring(4)
  }



  // 13. Resolver INST_NAME / INST_LOCAL / INST_EF por materia
  // Usa INST.{N}, LOCAL.{N}, EF.{N} del propio map (formato plano)
  for (const [key, slotStr] of Object.entries(map)) {
    if (!key.startsWith('INST.') || key.startsWith('INST.BASICA') || key.startsWith('INST.DIV')) continue
    const parts = key.split(".")
    if (parts.length !== 3) continue
    const code = parts[1]
    const year = parts[2]
    const slotNum = parseInt(slotStr, 10)
    if (isNaN(slotNum) || slotNum < 1) continue
    const suffix = "." + code + "." + year
    const denom = map['INST.' + slotNum] || map['INST.BASICA.' + slotNum] || ''
    const local = map['LOCAL.' + slotNum] || map['LOCAL.BASICA.' + slotNum] || ''
    const ef = map['EF.' + slotNum] || map['EF.BASICA.' + slotNum] || ''
    if (denom) map['INST_NAME' + suffix] = denom
    if (local) map['INST_LOCAL' + suffix] = local
    if (ef) map['INST_EF' + suffix] = ef
  }
  return map
}
