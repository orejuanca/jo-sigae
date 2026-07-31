#!/usr/bin/env python3
"""Replace flattenRawData in dashboard-content.tsx with a version
that handles flat FIELD_MAP keys FIRST, without mixing SECCION/GRUPO."""

import re

FILE = '/home/z/my-project/jo-sigae/src/components/dashboard-content.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# Find the start and end of flattenRawData function
# Start: the comment line before the function
# End: the closing '  }' followed by newline and next function/comment

start_marker = "  // === CONVERTIR RAWDATA"
end_marker = "  // === BUSCAR ESTUDIANTE"

start_idx = content.index(start_marker)
end_idx = content.index(end_marker)

new_function = '''  // === CONVERTIR RAWDATA → CLAVES PLANAS DEL FIELD_MAP ===
  // Si el rawData ya tiene claves planas (NOTA.CA.1, SECCION.1, PG.GRUPO.1, etc.),
  // las copia TODAS en orden directo, sin omitir ninguna ni mezclar campos.
  const flattenRawData = (raw: Record<string, unknown>): Record<string, string> => {
    const out: Record<string, string> = {}
    if (!raw || typeof raw !== 'object') return out

    // Detectar si rawData tiene claves planas del FIELD_MAP
    const rawKeys = Object.keys(raw)
    const hasFlatFieldMapKeys = rawKeys.some(k => /^[A-Z]/.test(k) && k.includes('.') && FIELD_MAP.some(([fm]) => fm === k))

    // === RAMA A: Claves planas → copiar directo en orden ===
    if (hasFlatFieldMapKeys) {
      const fieldMapSet = new Set(FIELD_MAP.map(([k]) => k))
      for (const key of rawKeys) {
        if (fieldMapSet.has(key) && raw[key] != null && raw[key] !== undefined) {
          const sv = String(raw[key])
          if (sv) out[key] = sv
        }
      }
      return out
    }

    // === RAMA B: Formato estructurado o legacy numérico ===
    const ABBREV_NORM: Record<string, string> = { FSN: 'FS' }
    const norm = (abrev: string): string => {
      const a = (abrev || '').toUpperCase().trim()
      return ABBREV_NORM[a] || a
    }

    // ─── 1) FORMATO ESTRUCTURADO (_format: structured_v1) ───
    if (raw._format === 'structured_v1') {
      const insts = raw.instituciones
      if (Array.isArray(insts)) {
        for (let i = 0; i < Math.min(insts.length, 5); i++) {
          const inst = insts[i] as Record<string, string> | null
          if (!inst) continue
          if (inst.denominacion) out[`INST.${i+1}`] = String(inst.denominacion).trim()
          if (inst.localidad)  out[`LOCAL.${i+1}`] = String(inst.localidad).trim()
          if (inst.ef)          out[`EF.${i+1}`]    = String(inst.ef).trim()
        }
      }

      const cals = raw.calificaciones
      if (Array.isArray(cals)) {
        for (const c of cals) {
          const cal = c as Record<string, unknown>
          const y = Number(cal.anioEscolar)
          if (!y || y < 1 || y > 5) continue
          const a = norm(String(cal.abrev || ''))
          if (!a) continue
          if (cal.nota) out[`NOTA.${a}.${y}`]  = String(cal.nota).trim()
          if (cal.eval) out[`EVAL.${a}.${y}`]  = String(cal.eval).trim()
          if (cal.mes)  out[`MES.${a}.${y}`]   = String(cal.mes).trim()
          if (cal.anio) out[`AÑO.${a}.${y}`]  = String(cal.anio).trim()
          if (cal.inst) out[`INST.${a}.${y}`]  = String(cal.inst).trim()
        }
      }

      const oris = raw.orientacion
      if (Array.isArray(oris)) {
        for (let i = 0; i < Math.min(oris.length, 5); i++) {
          const o = oris[i] as Record<string, string> | null
          if (o?.literal) out[`OC.LITERAL.${i+1}`] = String(o.literal).trim()
        }
      }

      const grps = raw.grupos
      if (Array.isArray(grps)) {
        for (let i = 0; i < Math.min(grps.length, 5); i++) {
          const g = grps[i] as Record<string, string> | null
          if (!g) continue
          if (g.grupo)  out[`PG.GRUPO.${i+1}`]  = String(g.grupo).trim()
          if (g.literal) out[`PG.LITERAL.${i+1}`] = String(g.literal).trim()
        }
      }

      const obs = raw.observaciones
      if (Array.isArray(obs)) {
        for (let i = 0; i < 4; i++) {
          if (obs[i]) out[`OBS.CERT.L${i+1}`] = String(obs[i]).trim()
        }
      }
      const obsNotas = raw.observacionesNotas
      if (Array.isArray(obsNotas)) {
        for (let i = 0; i < 3; i++) {
          if (obsNotas[i]) out[`OBS.NOTAS.L${i+1}`] = String(obsNotas[i]).trim()
        }
      }
      const obsBoleta = raw.observacionesBoleta
      if (Array.isArray(obsBoleta)) {
        for (let i = 0; i < 3; i++) {
          if (obsBoleta[i]) out[`OBS.BOLETA.L${i+1}`] = String(obsBoleta[i]).trim()
        }
      }

      // Secciones: solo desde raw.secciones, NUNCA desde grupos[].grupo
      const secs = raw.secciones
      if (Array.isArray(secs)) {
        for (let i = 0; i < Math.min(secs.length, 5); i++) {
          if (secs[i]) out[`SECCION.${i+1}`] = String(secs[i]).trim()
        }
      }

      if (raw.acta)             out['TITULO.SERIAL']      = String(raw.acta).trim()
      if (raw.tituloExpedicion) out['TITULO.EXPEDICION'] = fmtDate(raw.tituloExpedicion)
      if (raw.actaAnio)         out['TITULO.EGRESO']     = String(raw.actaAnio).trim()
      if (raw.actaFecha)        out['CERT.EXPEDICION']   = fmtDate(raw.actaFecha)

      const litFinal = raw.literalesFinales
      if (Array.isArray(litFinal) && !Array.isArray(raw.grupos)) {
        for (let i = 0; i < Math.min(litFinal.length, 5); i++) {
          if (litFinal[i]) out[`PG.LITERAL.${i+1}`] = String(litFinal[i]).trim()
        }
      }
    }

    // ─── 2) FORMATO LEGACY (claves numéricas) ───
    const hasNumericKeys = Object.keys(raw).some(k => /^\d+$/.test(k))
    if (hasNumericKeys) {
      for (let i = 0; i < 5; i++) {
        const nk = String(8 + i * 3)
        const lk = String(9 + i * 3)
        const ek = String(10 + i * 3)
        if (raw[nk]) out[`INST.${i+1}`]  = String(raw[nk]).replace(/^\*/, '').trim()
        if (raw[lk]) out[`LOCAL.${i+1}`] = String(raw[lk]).replace(/^\*/, '').trim()
        if (raw[ek]) out[`EF.${i+1}`]    = String(raw[ek]).trim()
      }

      const yearBlocks = [
        { year: 1, start: 23, count: 7 },
        { year: 2, start: 58, count: 7 },
        { year: 3, start: 93, count: 8 },
        { year: 4, start: 133, count: 9 },
        { year: 5, start: 178, count: 10 },
      ]
      const abrevsByYear: Record<number, string[]> = {
        1: ['CA','IN','MA','EF','AP','CN','GH'],
        2: ['CA','IN','MA','EF','AP','CN','GH'],
        3: ['CA','IN','MA','EF','FI','QU','BI','GH'],
        4: ['CA','IN','MA','EF','FI','QU','BI','GH','FS'],
        5: ['CA','IN','MA','EF','FI','QU','BI','CT','GH','FS'],
      }
      for (const block of yearBlocks) {
        const abrevs = abrevsByYear[block.year] || []
        for (let i = 0; i < block.count; i++) {
          const col = block.start + i * 5
          const abrev = abrevs[i] || `M${i+1}`
          const nota = raw[String(col)]
          const eval_ = raw[String(col + 1)]
          const mes  = raw[String(col + 2)]
          const anio = raw[String(col + 3)]
          const inst = raw[String(col + 4)]
          if (nota) out[`NOTA.${abrev}.${block.year}`] = String(nota).trim()
          if (eval_) out[`EVAL.${abrev}.${block.year}`] = String(eval_).trim()
          if (mes)  out[`MES.${abrev}.${block.year}`]  = fmtDate(String(mes).trim())
          if (anio) out[`AÑO.${abrev}.${block.year}`]  = String(anio).trim()
          if (inst) out[`INST.${abrev}.${block.year}`] = String(inst).trim()
        }
      }

      for (let i = 0; i < 5; i++) {
        const v = raw[String(228 + i)]
        if (v) out[`OC.LITERAL.${i+1}`] = String(v).trim()
      }
      for (let i = 0; i < 5; i++) {
        const gd = raw[String(233 + i)]
        const gl = raw[String(238 + i)]
        if (gd) out[`PG.GRUPO.${i+1}`] = String(gd).trim()
        if (gl) out[`PG.LITERAL.${i+1}`] = String(gl).trim()
      }
      // En legacy, cols 233-237 son la única fuente → SECCION = PG.GRUPO
      for (let i = 0; i < 5; i++) {
        const sd = raw[String(233 + i)]
        if (sd) out[`SECCION.${i+1}`] = String(sd).trim()
      }
      const obsCertCols = [243, 244, 260, 261]
      for (let i = 0; i < obsCertCols.length; i++) {
        const v = raw[String(obsCertCols[i])]
        if (v) out[`OBS.CERT.L${i+1}`] = String(v).trim()
      }
      const obsNotasCols = [245, 246, 247]
      for (let i = 0; i < obsNotasCols.length; i++) {
        const v = raw[String(obsNotasCols[i])]
        if (v) out[`OBS.NOTAS.L${i+1}`] = String(v).trim()
      }
      const obsBoletaCols = [257, 258, 259]
      for (let i = 0; i < obsBoletaCols.length; i++) {
        const v = raw[String(obsBoletaCols[i])]
        if (v) out[`OBS.BOLETA.L${i+1}`] = String(v).trim()
      }
      if (raw['253']) out['TITULO.SERIAL']      = String(raw['253']).trim()
      if (raw['254']) out['CERT.EXPEDICION']   = fmtDate(raw['254'])
      if (raw['255']) out['TITULO.EGRESO']     = String(raw['255']).trim()
      if (raw['256']) out['TITULO.EXPEDICION'] = fmtDate(raw['256'])
    }

    // ─── 3) FALLBACK: claves planas del raw que coincidan con FIELD_MAP ───
    const fieldMapKeys = new Set(FIELD_MAP.map(([k]) => k))
    for (const [key, val] of Object.entries(raw)) {
      if (fieldMapKeys.has(key) && val !== null && val !== undefined) {
        const sv = String(val)
        if (sv && !out[key]) out[key] = sv
      }
    }

    return out
  }

'''

new_content = content[:start_idx] + new_function + content[end_idx:]

with open(FILE, 'w') as f:
    f.write(new_content)

print(f'Replaced flattenRawData: {end_idx - start_idx} old chars → {len(new_function)} new chars')
