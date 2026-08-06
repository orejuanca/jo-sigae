// Utilidad compartida para aplanar rawData estructurado (structured_v1 o legacy numérico)
// a claves planas del FIELD_MAP (NOTA.CA.1, INST.1, etc.)
// Usado por: dashboard-content.tsx y api/export/route.ts

// Formatear fecha a DD/MM/AAAA
export function fmtDate(val: unknown): string {
  if (!val) return ''
  const s = String(val).trim()
  if (!s) return ''
  // Ya en DD/MM/AAAA
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const p = s.split('/')
    return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`
  }
  // YYYY-MM-DD o ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      const p = s.substring(0, 10).split('-')
      return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`
    } catch { /* return s */ }
  }
  return s
}

// Todas las claves conocidas del FIELD_MAP (para fallback step 3)
const FIELD_MAP_KEYS = new Set([
  'CEDULA','FECHA','APELLIDOS','NOMBRES','PAIS','ESTADO','MUNICIPIO',
  'INST.1','LOCAL.1','EF.1','INST.2','LOCAL.2','EF.2',
  'INST.3','LOCAL.3','EF.3','INST.4','LOCAL.4','EF.4',
  'INST.5','LOCAL.5','EF.5',
  'NOTA.CA.1','EVAL.CA.1','MES.CA.1','AÑO.CA.1','INST.CA.1',
  'NOTA.IN.1','EVAL.IN.1','MES.IN.1','AÑO.IN.1','INST.IN.1',
  'NOTA.MA.1','EVAL.MA.1','MES.MA.1','AÑO.MA.1','INST.MA.1',
  'NOTA.EF.1','EVAL.EF.1','MES.EF.1','AÑO.EF.1','INST.EF.1',
  'NOTA.AP.1','EVAL.AP.1','MES.AP.1','AÑO.AP.1','INST.AP.1',
  'NOTA.CN.1','EVAL.CN.1','MES.CN.1','AÑO.CN.1','INST.CN.1',
  'NOTA.GH.1','EVAL.GH.1','MES.GH.1','AÑO.GH.1','INST.GH.1',
  'NOTA.CA.2','EVAL.CA.2','MES.CA.2','AÑO.CA.2','INST.CA.2',
  'NOTA.IN.2','EVAL.IN.2','MES.IN.2','AÑO.IN.2','INST.IN.2',
  'NOTA.MA.2','EVAL.MA.2','MES.MA.2','AÑO.MA.2','INST.MA.2',
  'NOTA.EF.2','EVAL.EF.2','MES.EF.2','AÑO.EF.2','INST.EF.2',
  'NOTA.AP.2','EVAL.AP.2','MES.AP.2','AÑO.AP.2','INST.AP.2',
  'NOTA.CN.2','EVAL.CN.2','MES.CN.2','AÑO.CN.2','INST.CN.2',
  'NOTA.GH.2','EVAL.GH.2','MES.GH.2','AÑO.GH.2','INST.GH.2',
  'NOTA.CA.3','EVAL.CA.3','MES.CA.3','AÑO.CA.3','INST.CA.3',
  'NOTA.IN.3','EVAL.IN.3','MES.IN.3','AÑO.IN.3','INST.IN.3',
  'NOTA.MA.3','EVAL.MA.3','MES.MA.3','AÑO.MA.3','INST.MA.3',
  'NOTA.EF.3','EVAL.EF.3','MES.EF.3','AÑO.EF.3','INST.EF.3',
  'NOTA.FI.3','EVAL.FI.3','MES.FI.3','AÑO.FI.3','INST.FI.3',
  'NOTA.QU.3','EVAL.QU.3','MES.QU.3','AÑO.QU.3','INST.QU.3',
  'NOTA.BI.3','EVAL.BI.3','MES.BI.3','AÑO.BI.3','INST.BI.3',
  'NOTA.GH.3','EVAL.GH.3','MES.GH.3','AÑO.GH.3','INST.GH.3',
  'NOTA.CA.4','EVAL.CA.4','MES.CA.4','AÑO.CA.4','INST.CA.4',
  'NOTA.IN.4','EVAL.IN.4','MES.IN.4','AÑO.IN.4','INST.IN.4',
  'NOTA.MA.4','EVAL.MA.4','MES.MA.4','AÑO.MA.4','INST.MA.4',
  'NOTA.EF.4','EVAL.EF.4','MES.EF.4','AÑO.EF.4','INST.EF.4',
  'NOTA.FI.4','EVAL.FI.4','MES.FI.4','AÑO.FI.4','INST.FI.4',
  'NOTA.QU.4','EVAL.QU.4','MES.QU.4','AÑO.QU.4','INST.QU.4',
  'NOTA.BI.4','EVAL.BI.4','MES.BI.4','AÑO.BI.4','INST.BI.4',
  'NOTA.GH.4','EVAL.GH.4','MES.GH.4','AÑO.GH.4','INST.GH.4',
  'NOTA.FS.4','EVAL.FS.4','MES.FS.4','AÑO.FS.4','INST.FS.4',
  'NOTA.CA.5','EVAL.CA.5','MES.CA.5','AÑO.CA.5','INST.CA.5',
  'NOTA.IN.5','EVAL.IN.5','MES.IN.5','AÑO.IN.5','INST.IN.5',
  'NOTA.MA.5','EVAL.MA.5','MES.MA.5','AÑO.MA.5','INST.MA.5',
  'NOTA.EF.5','EVAL.EF.5','MES.EF.5','AÑO.EF.5','INST.EF.5',
  'NOTA.FI.5','EVAL.FI.5','MES.FI.5','AÑO.FI.5','INST.FI.5',
  'NOTA.QU.5','EVAL.QU.5','MES.QU.5','AÑO.QU.5','INST.QU.5',
  'NOTA.BI.5','EVAL.BI.5','MES.BI.5','AÑO.BI.5','INST.BI.5',
  'NOTA.CT.5','EVAL.CT.5','MES.CT.5','AÑO.CT.5','INST.CT.5',
  'NOTA.GH.5','EVAL.GH.5','MES.GH.5','AÑO.GH.5','INST.GH.5',
  'NOTA.FS.5','EVAL.FS.5','MES.FS.5','AÑO.FS.5','INST.FS.5',
  'OC.LITERAL.1','OC.LITERAL.2','OC.LITERAL.3','OC.LITERAL.4','OC.LITERAL.5',
  'PG.GRUPO.1','PG.GRUPO.2','PG.GRUPO.3','PG.GRUPO.4','PG.GRUPO.5',
  'PG.LITERAL.1','PG.LITERAL.2','PG.LITERAL.3','PG.LITERAL.4','PG.LITERAL.5',
  'OBS.CERT.L1','OBS.CERT.L2','OBS.CERT.L3','OBS.CERT.L4',
  'OBS.NOTAS.L1','OBS.NOTAS.L2','OBS.NOTAS.L3',
  'OBS.BOLETA.L1','OBS.BOLETA.L2','OBS.BOLETA.L3',
  'SECCION.1','SECCION.2','SECCION.3','SECCION.4','SECCION.5',
  'TITULO.SERIAL','TITULO.EXPEDICION','TITULO.EGRESO','CERT.EXPEDICION',
])

// Campos de fecha que SIEMPRE pasan por fmtDate
const DATE_FIELDS = new Set([
  ...Array.from(FIELD_MAP_KEYS).filter(k => k.startsWith('MES.') || k === 'FECHA' || k === 'CERT.EXPEDICION' || k === 'TITULO.EXPEDICION'),
  // Campos de fecha del plan derogado
  'FECHAEMISIONT', 'FECHAEMISIONN',
])

/**
 * Convierte rawData (estructurado structured_v1 o legacy numérico) a claves planas del FIELD_MAP.
 * Retorna un Record<string, string> con claves como 'NOTA.CA.1', 'INST.3', etc.
 */
export function flattenRawData(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out

  // Normalización de abreviaturas: rawData usa 'FSN' pero FIELD_MAP usa 'FS'
  const ABBREV_NORM: Record<string, string> = { FSN: 'FS' }
  const norm = (abrev: string): string => {
    const a = (abrev || '').toUpperCase().trim()
    return ABBREV_NORM[a] || a
  }

  // ─── 1) FORMATO ESTRUCTURADO (_format: structured_v1) ───
  if (raw._format === 'structured_v1') {
    // Instituciones → INST.1..5, LOCAL.1..5, EF.1..5
    const insts = raw.instituciones
    if (Array.isArray(insts)) {
      for (let i = 0; i < Math.min(insts.length, 5); i++) {
        const inst = insts[i] as Record<string, string> | null
        if (!inst) continue
        if (inst.denominacion) out[`INST.${i + 1}`] = String(inst.denominacion).trim()
        if (inst.localidad) out[`LOCAL.${i + 1}`] = String(inst.localidad).trim()
        if (inst.ef) out[`EF.${i + 1}`] = String(inst.ef).trim()
      }
    }

    // Calificaciones → NOTA.{abrev}.{year}, EVAL..., MES..., AÑO..., INST...
    const cals = raw.calificaciones
    if (Array.isArray(cals)) {
      for (const c of cals) {
        const cal = c as Record<string, unknown>
        const y = Number(cal.anioEscolar)
        if (!y || y < 1 || y > 5) continue
        const a = norm(String(cal.abrev || ''))
        if (!a) continue
        if (cal.nota) out[`NOTA.${a}.${y}`] = String(cal.nota).trim()
        if (cal.eval) out[`EVAL.${a}.${y}`] = String(cal.eval).trim()
        if (cal.mes) out[`MES.${a}.${y}`] = fmtDate(String(cal.mes).trim())
        if (cal.anio) out[`AÑO.${a}.${y}`] = String(cal.anio).trim()
        if (cal.inst) out[`INST.${a}.${y}`] = String(cal.inst).trim()
      }
    }

    // Orientación → OC.LITERAL.1..5
    const oris = raw.orientacion
    if (Array.isArray(oris)) {
      for (let i = 0; i < Math.min(oris.length, 5); i++) {
        const o = oris[i] as Record<string, string> | null
        if (o?.literal) out[`OC.LITERAL.${i + 1}`] = String(o.literal).trim()
      }
    }

    // Grupos → PG.GRUPO.1..5, PG.LITERAL.1..5
    const grps = raw.grupos
    if (Array.isArray(grps)) {
      for (let i = 0; i < Math.min(grps.length, 5); i++) {
        const g = grps[i] as Record<string, string> | null
        if (!g) continue
        if (g.grupo) out[`PG.GRUPO.${i + 1}`] = String(g.grupo).trim()
        if (g.literal) out[`PG.LITERAL.${i + 1}`] = String(g.literal).trim()
      }
    }

    // Observaciones → OBS.CERT.L1..L4
    const obs = raw.observaciones
    if (Array.isArray(obs)) {
      for (let i = 0; i < 4; i++) {
        if (obs[i]) out[`OBS.CERT.L${i + 1}`] = String(obs[i]).trim()
      }
    }

    // Observaciones de Notas → OBS.NOTAS.L1..L3
    const obsNotas = raw.observacionesNotas
    if (Array.isArray(obsNotas)) {
      for (let i = 0; i < 3; i++) {
        if (obsNotas[i]) out[`OBS.NOTAS.L${i + 1}`] = String(obsNotas[i]).trim()
      }
    }

    // Observaciones de Boleta → OBS.BOLETA.L1..L3
    const obsBoleta = raw.observacionesBoleta
    if (Array.isArray(obsBoleta)) {
      for (let i = 0; i < 3; i++) {
        if (obsBoleta[i]) out[`OBS.BOLETA.L${i + 1}`] = String(obsBoleta[i]).trim()
      }
    }

    // Secciones → SECCION.1..5 (desde grupos[].grupo si no hay raw.secciones)
    const secs = raw.secciones
    if (Array.isArray(secs) && secs.some(s => s)) {
      for (let i = 0; i < Math.min(secs.length, 5); i++) {
        if (secs[i]) out[`SECCION.${i + 1}`] = String(secs[i]).trim()
      }
    } else {
      const grps2 = raw.grupos
      if (Array.isArray(grps2)) {
        for (let i = 0; i < Math.min(grps2.length, 5); i++) {
          const g2 = grps2[i] as Record<string, string> | null
          if (g2?.grupo) out[`SECCION.${i + 1}`] = String(g2.grupo).trim()
        }
      }
    }
    // Siempre complementar con grupos[].grupo para secciones vacías
    const grps2 = raw.grupos
    if (Array.isArray(grps2)) {
      for (let i = 0; i < Math.min(grps2.length, 5); i++) {
        if (!out[`SECCION.${i + 1}`]) {
          const g2 = grps2[i] as Record<string, string> | null
          if (g2?.grupo) out[`SECCION.${i + 1}`] = String(g2.grupo).trim()
        }
      }
    }

    // Título / Acta
    if (raw.acta) out['TITULO.SERIAL'] = String(raw.acta).trim()
    if (raw.tituloExpedicion) out['TITULO.EXPEDICION'] = fmtDate(raw.tituloExpedicion)
    if (raw.actaAnio) out['TITULO.EGRESO'] = String(raw.actaAnio).trim()
    if (raw.actaFecha) out['CERT.EXPEDICION'] = fmtDate(raw.actaFecha)

    // Literales finales → PG.LITERAL (si existen como alternativa)
    const litFinal = raw.literalesFinales
    if (Array.isArray(litFinal) && !Array.isArray(raw.grupos)) {
      for (let i = 0; i < Math.min(litFinal.length, 5); i++) {
        if (litFinal[i]) out[`PG.LITERAL.${i + 1}`] = String(litFinal[i]).trim()
      }
    }

    // NO return aquí — dejamos caer al fallback (paso 3)
  }

  // ─── 2) FORMATO LEGACY (claves numéricas) ───
  const hasNumericKeys = Object.keys(raw).some(k => /^\d+$/.test(k))
  if (hasNumericKeys) {
    // Instituciones: cols 8-22 (keys "8"-"22"), 5 inst × 3 campos
    for (let i = 0; i < 5; i++) {
      const nk = String(8 + i * 3)   // 8,11,14,17,20
      const lk = String(9 + i * 3)   // 9,12,15,18,21
      const ek = String(10 + i * 3)  // 10,13,16,19,22
      if (raw[nk]) out[`INST.${i + 1}`] = String(raw[nk]).replace(/^\*/, '').trim()
      if (raw[lk]) out[`LOCAL.${i + 1}`] = String(raw[lk]).replace(/^\*/, '').trim()
      if (raw[ek]) out[`EF.${i + 1}`] = String(raw[ek]).trim()
    }

    // Calificaciones por año (bloques fijos del Excel BD)
    const yearBlocks = [
      { year: 1, start: 23, count: 7 },
      { year: 2, start: 58, count: 7 },
      { year: 3, start: 93, count: 8 },
      { year: 4, start: 133, count: 9 },
      { year: 5, start: 178, count: 10 },
    ]
    const abrevsByYear: Record<number, string[]> = {
      1: ['CA', 'IN', 'MA', 'EF', 'AP', 'CN', 'GH'],
      2: ['CA', 'IN', 'MA', 'EF', 'AP', 'CN', 'GH'],
      3: ['CA', 'IN', 'MA', 'EF', 'FI', 'QU', 'BI', 'GH'],
      4: ['CA', 'IN', 'MA', 'EF', 'FI', 'QU', 'BI', 'GH', 'FS'],
      5: ['CA', 'IN', 'MA', 'EF', 'FI', 'QU', 'BI', 'CT', 'GH', 'FS'],
    }
    for (const block of yearBlocks) {
      const abrevs = abrevsByYear[block.year] || []
      for (let i = 0; i < block.count; i++) {
        const col = block.start + i * 5
        const abrev = abrevs[i] || `M${i + 1}`
        const nota = raw[String(col)]
        const eval_ = raw[String(col + 1)]
        const mes = raw[String(col + 2)]
        const anio = raw[String(col + 3)]
        const inst = raw[String(col + 4)]
        if (nota) out[`NOTA.${abrev}.${block.year}`] = String(nota).trim()
        if (eval_) out[`EVAL.${abrev}.${block.year}`] = String(eval_).trim()
        if (mes) out[`MES.${abrev}.${block.year}`] = fmtDate(String(mes).trim())
        if (anio) out[`AÑO.${abrev}.${block.year}`] = String(anio).trim()
        if (inst) out[`INST.${abrev}.${block.year}`] = String(inst).trim()
      }
    }

    // Orientación (cols 228-232)
    for (let i = 0; i < 5; i++) {
      const v = raw[String(228 + i)]
      if (v) out[`OC.LITERAL.${i + 1}`] = String(v).trim()
    }
    // Grupos descripción (cols 233-237) y literal (cols 238-242)
    for (let i = 0; i < 5; i++) {
      const gd = raw[String(233 + i)]
      const gl = raw[String(238 + i)]
      if (gd) out[`PG.GRUPO.${i + 1}`] = String(gd).trim()
      if (gl) out[`PG.LITERAL.${i + 1}`] = String(gl).trim()
    }
    // Secciones (cols 233-237 = grupo descripción)
    for (let i = 0; i < 5; i++) {
      const sd = raw[String(233 + i)]
      if (sd) out[`SECCION.${i + 1}`] = String(sd).trim()
    }
    // Observaciones certificación (cols 243,244,260,261)
    const obsCertCols = [243, 244, 260, 261]
    for (let i = 0; i < obsCertCols.length; i++) {
      const v = raw[String(obsCertCols[i])]
      if (v) out[`OBS.CERT.L${i + 1}`] = String(v).trim()
    }
    // Observaciones de Notas (cols 245,246,247)
    const obsNotasCols = [245, 246, 247]
    for (let i = 0; i < obsNotasCols.length; i++) {
      const v = raw[String(obsNotasCols[i])]
      if (v) out[`OBS.NOTAS.L${i + 1}`] = String(v).trim()
    }
    // Observaciones de Boleta (cols 257,258,259)
    const obsBoletaCols = [257, 258, 259]
    for (let i = 0; i < obsBoletaCols.length; i++) {
      const v = raw[String(obsBoletaCols[i])]
      if (v) out[`OBS.BOLETA.L${i + 1}`] = String(v).trim()
    }
    // Acta (cols 253-255)
    if (raw['253']) out['TITULO.SERIAL'] = String(raw['253']).trim()
    if (raw['254']) out['CERT.EXPEDICION'] = fmtDate(raw['254'])
    if (raw['255']) out['TITULO.EGRESO'] = String(raw['255']).trim()
    // Título expedición (col 256)
    if (raw['256']) out['TITULO.EXPEDICION'] = fmtDate(raw['256'])
  }

  // ─── 3) FALLBACK DIRECTO: cualquier clave del raw que coincida con FIELD_MAP ───
  for (const [key, val] of Object.entries(raw)) {
    if (FIELD_MAP_KEYS.has(key) && val !== null && val !== undefined) {
      const sv = String(val).trim()
      if (sv && !out[key]) out[key] = DATE_FIELDS.has(key) ? fmtDate(sv) : sv
    }
  }

  return out
}
