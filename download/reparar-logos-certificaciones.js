#!/usr/bin/env node
/* ============================================================================
   REPARAR LOGOS DE CERTIFICACIONES — PLAN DEROGADO
   ----------------------------------------------------------------------------
   Diagnostica y repara, directamente contra la API de tu app (localhost:3000),
   el logo del ministerio (##LOGO_CEMG##) en TODOS los layouts de
   certificaciones del plan derogado. Sin tocar el editor, sin tocar la app.

   Por que esto y no un boton en la app: el boton "Reparar Derogados" de las
   versiones anteriores saltaba cualquier layout que TUVIERA el token
   ##LOGO_*## en los datos, aunque ese token estuviera:
     (a) PISADO  — la celda tiene un dataBinding que al renderizar reemplaza
                   el token por texto vacio (cert-view linea 434-435 original:
                   displayContent = resolveBinding(...) || '') → logo invisible
     (b) TAPADO  — la celda del token esta cubierta por el colspan/rowspan de
                   otra celda → el render la salta (set "occupied")
     (c) AUSENTE — el token no existe en los datos
   En EMG 31059 (vigente) el token esta LIMPIO (sin binding, visible) y por
   eso funciona. Este script deja cada layout derogado EXACTAMENTE igual:
   token limpio, visible, con el mismo estilo de la referencia vigente.

   USO (en la carpeta de tu proyecto, con la app corriendo):
     node reparar-logos-certificaciones.js               → diagnostico + reparacion
     node reparar-logos-certificaciones.js --diagnostico → SOLO lectura (no escribe)
     node reparar-logos-certificaciones.js --url=http://localhost:3000

   Requiere Node 18+ (usa fetch global). Imprime evidencia cruda de cada
   operacion (status HTTP y cuerpos de error tal cual los devuelve la API).
   ========================================================================== */

'use strict'

const ARGS = process.argv.slice(2)
const BASE = (ARGS.find(a => a.startsWith('--url=')) || '--url=http://localhost:3000').split('=')[1].replace(/\/+$/, '')
const DRY_RUN = ARGS.includes('--diagnostico')
const TEST_LAYOUT_ID = 'cmsj1rx4i0004po90x67iovoj' // hoja III ETAPA BASICA (caso de prueba del usuario)

// ---------------------------------------------------------------- helpers --
const c = { ok: '\x1b[32m', bad: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', dim: '\x1b[2m', off: '\x1b[0m', bold: '\x1b[1m' }
const ok = s => console.log(`${c.ok}${s}${c.off}`)
const bad = s => console.log(`${c.bad}${s}${c.off}`)
const warn = s => console.log(`${c.warn}${s}${c.off}`)
const info = s => console.log(`${c.info}${s}${c.off}`)
const dim = s => console.log(`${c.dim}${s}${c.off}`)

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`)
  let body = null
  const text = await res.text()
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}

async function apiPut(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let body = text
  try { body = JSON.parse(text) } catch { /* texto crudo */ }
  return { status: res.status, body }
}

// datos puede venir como objeto o como string JSON (el editor maneja ambos)
function parseDatos(layout) {
  if (!layout || layout.datos === undefined || layout.datos === null) return null
  if (typeof layout.datos === 'string') { try { return JSON.parse(layout.datos) } catch { return null } }
  return layout.datos
}

// ------------------------------------------- analisis del logo (como el render --
// Set "occupied": IDENTICO criterio al renderizador (cert-view / editor)
function computeOccupied(cfg) {
  const occ = new Set()
  for (let r = 0; r < cfg.rows.length; r++) {
    const row = cfg.rows[r]
    if (!row || !row.cells) continue
    for (const [key, cell] of Object.entries(row.cells)) {
      const col = Number(key)
      const rs = cell.rowspan || 1
      const cs = cell.colspan || 1
      if (rs > 1) { for (let dr = 1; dr < rs; dr++) occ.add(`${r + dr}-${col}`) }
      if (cs > 1) { for (let dc = 1; dc < cs; dc++) occ.add(`${r}-${col + dc}`) }
    }
  }
  return occ
}

const renderableToken = content => typeof content === 'string' && content.startsWith('##LOGO_') && content.endsWith('##')

// Busca TODAS las celdas con token ##LOGO_*## y las clasifica como el render las ve
function analyzeLogo(cfg) {
  const occ = computeOccupied(cfg)
  const totalCols = cfg.totalCols || 0
  const found = []
  for (let r = 0; r < cfg.rows.length; r++) {
    const row = cfg.rows[r]
    if (!row || !row.cells) continue
    for (const [key, cell] of Object.entries(row.cells)) {
      const col = Number(key)
      const content = cell.content || ''
      if (!content.includes('##LOGO_')) continue
      found.push({
        r, c: col, cell,
        renderable: renderableToken(content),
        covered: occ.has(`${r}-${col}`),
        fueraDeGrilla: col >= totalCols,
        pisado: !!cell.dataBinding,
      })
    }
  }
  // El logo se VE bien solo si: renderable + no cubierto + dentro de grilla + sin binding
  const limpio = found.find(f => f.renderable && !f.covered && !f.fueraDeGrilla && !f.pisado)
  let estado = 'SIN-LOGO'
  if (limpio) estado = 'VISIBLE-LIMPIO'
  else if (found.some(f => f.renderable && !f.covered && !f.fueraDeGrilla && f.pisado)) estado = 'PISADO'
  else if (found.some(f => f.covered || f.fueraDeGrilla)) estado = 'TAPADO'
  else if (found.length) estado = 'RARO' // token con texto alrededor u otra anomalia
  return { estado, celdas: found, occ, totalCols }
}

// ------------------------------------------------------------- reparacion --
function estiloCeldaLimpia(ref, colspanFinal, token) {
  // Clona el estilo de la celda de referencia (EMG 31059) pero SIN binding
  return {
    content: token,
    dataBinding: '',
    colspan: colspanFinal,
    rowspan: 1,
    width: ref ? (ref.width || '') : '',
    height: ref ? (ref.height || '') : '',
    fontSize: ref ? (ref.fontSize || 9) : 9,
    fontWeight: ref ? (ref.fontWeight || 'normal') : 'normal',
    textAlign: (ref && ref.textAlign) || 'center',
    verticalAlign: (ref && ref.verticalAlign) || 'middle',
    borderTop: ref ? ref.borderTop !== false : true,
    borderRight: ref ? ref.borderRight !== false : true,
    borderBottom: ref ? ref.borderBottom !== false : true,
    borderLeft: ref ? ref.borderLeft !== false : true,
    borderColor: (ref && ref.borderColor) || '#000000',
    bgColor: ref ? (ref.bgColor || '') : '',
    color: (ref && ref.color) || '',
    whiteSpace: (ref && ref.whiteSpace) || 'normal',
    padding: (ref && ref.padding) || '1px 2px',
    fontStyle: (ref && ref.fontStyle) || 'normal',
    textDecoration: (ref && ref.textDecoration) || 'none',
    autoFit: false,
    writingMode: 'horizontal-tb',
    borderStyle: (ref && ref.borderStyle) || 'solid',
    dateFormat: '',
  }
}

function celdaVacia(cell) { return !cell || ((!cell.content || cell.content === '') && !cell.dataBinding) }

// Puede colocar colspan en (r,c) sin tapar contenido existente?
function colspanSeguro(cfg, r, colStart, cs, occ) {
  for (let dc = 1; dc < cs; dc++) {
    const cc = colStart + dc
    if (cc >= cfg.totalCols) return false
    if (occ.has(`${r}-${cc}`)) return false
    const coveredCell = cfg.rows[r]?.cells?.[cc]
    if (!celdaVacia(coveredCell)) return false
  }
  return true
}

// Repara los datos EN MEMORIA. Retorna {datos, acciones[], insertoEn}
function repararDatos(datos, refInfo) {
  const acciones = []
  const cfg = { ...datos, rows: datos.rows.map(row => (row && row.cells ? { ...row, cells: { ...row.cells } } : row)) }
  const analysis = analyzeLogo(cfg)

  // 1) Limpiar/eliminar TODAS las celdas de logo que NO estan limpias
  for (const f of analysis.celdas) {
    if (f.renderable && !f.covered && !f.fueraDeGrilla && !f.pisado) continue // limpia → no tocar
    const row = cfg.rows[f.r]
    if (!row) continue
    if (f.pisado && f.renderable && !f.covered && !f.fueraDeGrilla) {
      // PISADO: solo quitar el binding que mata el token al renderizar
      row.cells[f.c] = { ...f.cell, dataBinding: '' }
      acciones.push(`binding pisador eliminado en fila ${f.r + 1} col ${f.c + 1} (${f.cell.dataBinding})`)
    } else {
      // TAPADO / RARO / fuera de grilla: quitar el token dañado y reinsertarlo limpio
      delete row.cells[f.c]
      acciones.push(`token defectuoso eliminado en fila ${f.r + 1} col ${f.c + 1} (${f.covered ? 'tapado' : f.fueraDeGrilla ? 'fuera de grilla' : 'malformado'})`)
    }
  }

  // 2) Si despues de limpiar no queda ningun logo limpio → insertar como la referencia
  if (!analyzeLogo(cfg).celdas.some(f => f.renderable && !f.covered && !f.fueraDeGrilla && !f.pisado)) {
    const occ = computeOccupied(cfg)
    const ref = refInfo ? refInfo.cell : null
    const token = refInfo ? refInfo.token : '##LOGO_CEMG##'
    let colocado = false

    // 2a) Posicion exacta de la referencia (ej. fila 1 col 1, como EMG 31059)
    if (refInfo) {
      const r = refInfo.r, col = refInfo.c
      const row = cfg.rows[r]
      const cellThere = row?.cells?.[col]
      if (row && !occ.has(`${r}-${col}`) && col < cfg.totalCols && celdaVacia(cellThere)) {
        const cs = colspanSeguro(cfg, r, col, refInfo.colspan, occ) ? refInfo.colspan : 1
        row.cells[col] = estiloCeldaLimpia(ref, cs, token)
        acciones.push(`logo insertado en la posicion de la referencia: fila ${r + 1} col ${col + 1} (colspan ${cs})`)
        colocado = true
      }
    }

    // 2b) Primera celda libre visible de las primeras 3 filas
    if (!colocado) {
      outer:
      for (let r = 0; r < Math.min(3, cfg.rows.length); r++) {
        const row = cfg.rows[r]
        if (!row || !row.cells) continue
        for (let col = 0; col < cfg.totalCols; col++) {
          if (occ.has(`${r}-${col}`)) continue
          if (!celdaVacia(row.cells[col])) continue
          let cs = 1
          const refCs = refInfo ? refInfo.colspan : 1
          if (refCs > 1 && colspanSeguro(cfg, r, col, refCs, occ)) cs = refCs
          row.cells[col] = estiloCeldaLimpia(ref, cs, token)
          acciones.push(`logo insertado en fila ${r + 1} col ${col + 1} (colspan ${cs})`)
          colocado = true
          break outer
        }
      }
    }

    // 2c) GARANTIA FINAL: fila nueva arriba con el logo, igual que EMG 31059
    //     (fila 1 del EMG = logo a la izquierda; el resto de la hoja baja 1 fila)
    if (!colocado) {
      const logoCs = refInfo && refInfo.colspan > 1 ? refInfo.colspan : 1
      const nueva = { cells: {} }
      nueva.cells[0] = estiloCeldaLimpia(ref, logoCs, token)
      if (cfg.totalCols > logoCs) {
        // celda de relleno sin bordes para completar el ancho (discreta)
        nueva.cells[logoCs] = estiloCeldaLimpia(null, 1, '')
        nueva.cells[logoCs] = { ...nueva.cells[logoCs], colspan: cfg.totalCols - logoCs, borderTop: false, borderRight: false, borderBottom: false, borderLeft: false, bgColor: '' }
      }
      cfg.rows = [nueva, ...cfg.rows]
      acciones.push(`sin espacio libre arriba: se inserto una fila nueva al inicio con el logo (fila 1, colspan ${logoCs}) — igual a la fila 1 de EMG 31059`)
      colocado = true
    }
  }

  // 3) Preservar _printScale y meta tal como los guarda el editor al Guardar
  const datosFinales = { ...cfg, meta: { ...(cfg.meta || {}), plan: (cfg.meta && cfg.meta.plan) || 'derogado' } }
  return { datos: datosFinales, acciones }
}

// ------------------------------------------------------------------- main --
async function main() {
  console.log('')
  console.log(`${c.bold}============================================================================${c.off}`)
  console.log(`${c.bold}  REPARAR LOGO DEL MINISTERIO — CERTIFICACIONES PLAN DEROGADO${c.off}`)
  console.log(`${c.bold}============================================================================${c.off}`)
  console.log(`API: ${BASE}${c.dim}   (modo: ${DRY_RUN ? 'SOLO DIAGNOSTICO, no se escribe nada' : 'diagnostico + reparacion'})${c.off}`)
  console.log('')

  // --- 1. Listar layouts de ambos planes ---
  let listas = {}
  for (const plan of ['vigente', 'derogado']) {
    const { status, body } = await apiGet(`/api/cert-layouts?plan=${plan}`)
    if (status !== 200 || !Array.isArray(body)) {
      bad(`ERROR listando plan ${plan}: HTTP ${status}`)
      bad(`Respuesta cruda: ${JSON.stringify(body).slice(0, 400)}`)
      process.exit(1)
    }
    listas[plan] = body
    info(`Plan ${plan}: ${body.length} layouts`)
  }

  // --- 2. Cargar el layout de cada derogado + referencia vigente ---
  async function cargarLayout(id, plan) {
    // cert-view usa ?plan=&id= — el editor usa /{id}?plan= — probar AMBAS rutas
    const r1 = await apiGet(`/api/cert-layouts?plan=${plan}&id=${id}`)
    if (r1.status === 200 && r1.body && r1.body.datos !== undefined) return { layout: r1.body, ruta: `?plan=${plan}&id=${id}` }
    const r2 = await apiGet(`/api/cert-layouts/${id}?plan=${plan}`)
    if (r2.status === 200 && r2.body && r2.body.datos !== undefined) return { layout: r2.body, ruta: `/${id}?plan=${plan}` }
    return { layout: null, ruta: null, err: { r1: r1.status, r2: r2.status } }
  }

  // Referencia: primer layout VIGENTE con logo visible-limpio (normalmente EMG 31059)
  let refInfo = null, refNombre = ''
  console.log('')
  info('Buscando referencia (layout vigente con logo limpio)...')
  for (const l of listas.vigente) {
    const { layout } = await cargarLayout(l.id, 'vigente')
    if (!layout) continue
    const datos = parseDatos(layout)
    if (!datos || !datos.rows) continue
    const a = analyzeLogo(datos)
    const limpio = a.celdas.find(f => f.renderable && !f.covered && !f.fueraDeGrilla && !f.pisado)
    if (limpio) {
      refInfo = { r: limpio.r, c: limpio.c, colspan: limpio.cell.colspan || 1, cell: limpio.cell, token: limpio.cell.content }
      refNombre = layout.nombre || l.nombre || l.id
      ok(`Referencia encontrada: "${refNombre}" → ${limpio.cell.content} en fila ${limpio.r + 1}, col ${limpio.c + 1}, colspan ${limpio.cell.colspan || 1}, SIN binding`)
      break
    }
  }
  if (!refInfo) warn('No se encontro referencia vigente con logo limpio; se usara ##LOGO_CEMG## centrado con colspan 1')
  else console.log(`${c.dim}   (por eso EMG 31059 imprime el logo: token presente, sin dataBinding, celda visible)${c.off}`)

  // --- 3. Diagnostico de cada derogado ---
  console.log('')
  console.log(`${c.bold}DIAGNOSTICO — PLAN DEROGADO (estado real en la base de datos)${c.off}`)
  console.log('---------------------------------------------------------------------------')

  const objetivo = []
  const vistos = new Set()
  for (const l of listas.derogado) {
    vistos.add(l.id)
    objetivo.push({ id: l.id, nombre: l.nombre || '(sin nombre)', enLista: true })
  }
  if (!vistos.has(TEST_LAYOUT_ID)) objetivo.push({ id: TEST_LAYOUT_ID, nombre: '(caso de prueba — NO aparece en la lista derogado)', enLista: false })

  let nOk = 0, nDañados = 0, nError = 0
  const resultados = []
  for (const obj of objetivo) {
    const { layout, ruta, err } = await cargarLayout(obj.id, 'derogado')
    if (!layout) {
      bad(`[ERROR]  ${obj.nombre} — GET fallo (${err ? `?id=: ${err.r1}, /{id}: ${err.r2}` : 'sin datos'})`)
      nError++; resultados.push({ ...obj, estado: 'ERROR-CARGA' }); continue
    }
    const datos = parseDatos(layout)
    if (!datos || !datos.rows) {
      bad(`[ERROR]  ${obj.nombre} — datos invalidos (layout.datos vacio o corrupto)`)
      nError++; resultados.push({ ...obj, estado: 'DATOS-INVALIDOS' }); continue
    }
    const a = analyzeLogo(datos)
    const det = a.celdas.map(f =>
      `fila ${f.r + 1}/col ${f.c + 1} ${f.renderable ? '' : '(malformado)'}${f.covered ? ' TAPADO' : ''}${f.fueraDeGrilla ? ' FUERA-DE-GRILLA' : ''}${f.pisado ? ` PISADO(binding=${f.cell.dataBinding})` : ''}`
    ).join(' | ') || 'ninguna celda con ##LOGO_*##'
    if (a.estado === 'VISIBLE-LIMPIO') { ok(`[OK]     ${obj.nombre}`); dim(`         ${det}`); nOk++ }
    else { bad(`[${a.estado}] ${obj.nombre}`); dim(`         ${det}`); nDañados++ }
    resultados.push({ ...obj, estado: a.estado, layout, datos, ruta })
  }

  console.log('---------------------------------------------------------------------------')
  console.log(`Resumen: ${c.ok}${nOk} sanos${c.off}, ${c.bad}${nDañados} dañados${c.off}, ${c.warn}${nError} con error de carga${c.off}`)
  console.log('')

  if (DRY_RUN) { info('Modo --diagnostico: no se escribio nada. Corre el script sin esa bandera para reparar.'); return }

  // --- 4. Reparacion ---
  const dañados = resultados.filter(r => r.estado && r.estado !== 'VISIBLE-LIMPIO' && r.estado !== 'ERROR-CARGA' && r.estado !== 'DATOS-INVALIDOS')
  if (dañados.length === 0) { ok('Nada que reparar: todos los layouts derogados tienen el logo limpio.'); return }

  console.log(`${c.bold}REPARACION (${dañados.length} layouts)${c.off}`)
  console.log('---------------------------------------------------------------------------')

  for (const r of dañados) {
    console.log('')
    info(`Reparando: "${r.nombre}" (${r.id})`)
    const { datos: datosFix, acciones } = repararDatos(r.datos, refInfo)
    for (const a of acciones) dim(`  - ${a}`)

    // PUT con el MISMO cuerpo que usa el boton Guardar del editor
    const putRes = await apiPut(`/api/cert-layouts?id=${r.id}&plan=derogado`, {
      nombre: r.layout.nombre,
      datos: datosFix,
    })
    if (putRes.status !== 200) {
      bad(`  PUT HTTP ${putRes.status} — respuesta cruda: ${JSON.stringify(putRes.body).slice(0, 400)}`)
      continue
    }
    dim(`  PUT HTTP 200 OK`)

    // Verificacion de ida y vuelta por AMBAS rutas de lectura
    let verificado = false
    const v1 = await apiGet(`/api/cert-layouts?plan=derogado&id=${r.id}`)
    const v2 = await apiGet(`/api/cert-layouts/${r.id}?plan=derogado`)
    for (const v of [v1, v2]) {
      if (v.status !== 200 || !v.body) continue
      const d = parseDatos(v.body)
      if (!d || !d.rows) continue
      const a = analyzeLogo(d)
      if (a.estado === 'VISIBLE-LIMPIO') { verificado = true; break }
    }
    if (verificado) ok(`  VERIFICADO: el logo quedo limpio y visible en la base de datos`)
    else bad(`  NO VERIFICADO tras el PUT — la API acepto el guardado pero el logo sigue sin verse limpio al releer (posible bug del backend: revisa arriba el estado tras re-GET)`)
  }

  console.log('')
  console.log(`${c.bold}===========================================================================${c.off}`)
  ok('LISTO. Abre ahora en el navegador cualquier certificado derogado para confirmar:')
  console.log(`   /cert-view?layout=<id>&plan=derogado`)
  console.log(`   Caso de prueba: /cert-view?layout=${TEST_LAYOUT_ID}&plan=derogado`)
  console.log('')
  info('Si algun layout sigue sin mostrar el logo, copia el diagnostico de arriba')
  info('(los corchetes [PISADO] / [TAPADO] / [SIN-LOGO] y sus detalles) y envialo tal cual:')
  info('esa es la evidencia que falta para cerrar el caso si el backend esta fallando.')
  console.log('')
}

main().catch(e => { bad(`FATAL: ${e && e.message ? e.message : e}`); process.exit(1) })
