'use client'

// ============================================================================
// DOCTOR DEL LOGO — Certificaciones (v7)
// Diagnostica y repara el logo del ministerio en UN layout o en todos los del
// plan derogado, mirando los datos REALES que devuelve la API (no suposiciones).
//
// Qué hace el diagnóstico (todo de solo lectura, no toca la BD):
//   1. Carga el MISMO layout por las DOS rutas de la API:
//        GET /api/cert-layouts?id=<id>&plan=...   (la que usa cert-view y el editor)
//        GET /api/cert-layouts/<id>?plan=...      (la que usaba la reparación masiva v4-v6)
//      y compara: mismo id, mismo nombre, mismos datos.
//   2. Comprueba si el layout está en la lista de /api/cert-layouts?plan=derogado
//      (si NO está, la reparación masiva anterior JAMÁS lo tocó: ese es el
//      escenario del layout huérfano). También revisa la lista del plan vigente.
//   3. Inventa cada celda buscando TODOS los tokens ##...## (LOGO_*, BGLOGO_*, etc.),
//      con fila/columna/colspan/rowspan, si está tapado por una combinación y si
//      tiene un dataBinding que puede pisarlo.
//   4. Prueba los archivos de imagen (/logo-*.png): responde 200 o 404. Un token
//      perfecto con un archivo que no existe produce un <img> roto = logo invisible.
//   5. Busca la REFERENCIA: una certificación vigente (ej. EMG 31059) que muestre
//      el logo, y documenta QUÉ mecanismo usa (token en celda o membrete flotante),
//      qué token exacto y qué archivo. La reparación copia ESE mecanismo.
//   6. Muestra un mini-mapa de las primeras filas y el JSON crudo.
//
// La reparación (este layout / todos los derogados) usa el mismo cuerpo que el
// botón Guardar del editor, y verifica re-leyendo la BD por ambas rutas.
// ============================================================================

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { GridConfig, CellConfig } from '@/components/cert-visual/types'
import { Loader2, RefreshCw, Wrench, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react'

// ---------- Tipos ----------

interface SavedLayout { id: string; nombre: string }

interface TokenCell {
  row: number
  col: number
  colspan: number
  rowspan: number
  content: string
  binding: string
  tapado: boolean          // cubierto por rowspan/colspan o fuera del ancho de la tabla
  esLogo: boolean          // ##LOGO_...##
  esBgLogo: boolean        // ##BGLOGO_...##
  renderizable: boolean    // el render solo convierte tokens que empiezan y terminan exacto
}

interface RutaInfo {
  etiqueta: string
  url: string
  status: number
  ok: boolean
  id?: string
  nombre?: string
  metaPlan?: string
  header: string[]
  datosBytes: number
  datosOk: boolean
}

interface Referencia {
  layout: string
  token: string | null      // token en celda (mecanismo preferido)
  overlay: string | null    // membrete flotante (respaldo informativo)
  row: number
  col: number
  colspan: number
  file: string
  fileOk: boolean | null
}

interface Finding { nivel: 'ok' | 'info' | 'warn' | 'error'; titulo: string; detalle: string }

interface Diagnostico {
  layoutId: string
  plan: string
  byQuery: RutaInfo | null
  byPath: RutaInfo | null
  datosIguales: boolean | null
  derTotal: number
  enDer: boolean
  vigTotal: number
  enVig: boolean
  derNombres: SavedLayout[]
  datos: GridConfig | null
  tokens: TokenCell[]
  overlay: GridConfig['logoOverlay'] | null
  archivos: { file: string; ok: boolean | null }[]
  referencia: Referencia | null
  hallazgos: Finding[]
  veredicto: { nivel: 'ok' | 'warn' | 'error'; texto: string }
}

type OpStatus = 'reparado' | 'ya-tenia' | 'manual' | 'no-persistio' | 'error' | 'ok'
interface OpLog { ts: string; nombre: string; status: OpStatus; detalle: string }

// ---------- Helpers de red ----------

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const r = await fetch(url)
    let data: any = null
    try { data = await r.json() } catch { /* respuesta no-JSON */ }
    return { ok: r.ok, status: r.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

function parseDatos(lay: any): GridConfig | null {
  if (!lay || typeof lay !== 'object') return null
  try {
    const p = typeof lay.datos === 'string' ? JSON.parse(lay.datos) : lay.datos
    if (p && Array.isArray(p.rows) && p.totalCols) return p as GridConfig
  } catch { /* datos ilegibles */ }
  return null
}

const primerRegistro = (d: any): any => (Array.isArray(d) ? d[0] : d)

// ---------- Helpers de grilla (mismo criterio que el render del editor) ----------

function computeOccupied(datos: GridConfig): Set<string> {
  const occ = new Set<string>()
  for (let r = 0; r < (datos.rows || []).length; r++) {
    const row = datos.rows[r]
    if (!row) continue
    for (const [key, cell] of Object.entries(row.cells || {})) {
      const c = Number(key)
      const rs = cell.rowspan || 1
      const cs = cell.colspan || 1
      if (rs > 1) { for (let dr = 1; dr < rs; dr++) occ.add(`${r + dr}-${c}`) }
      if (cs > 1) { for (let dc = 1; dc < cs; dc++) occ.add(`${r}-${c + dc}`) }
    }
  }
  return occ
}

// El render solo convierte tokens que empiezan por ##LOGO_ y terminan en ##
function esTokenLogoRenderizable(content: string): boolean {
  return /^##LOGO_.+##$/.test((content || '').trim())
}

function scanTokens(datos: GridConfig): TokenCell[] {
  const occ = computeOccupied(datos)
  const out: TokenCell[] = []
  for (let r = 0; r < (datos.rows || []).length; r++) {
    const row = datos.rows[r]
    if (!row) continue
    for (const [k, cell] of Object.entries(row.cells || {})) {
      const c = (cell.content || '').trim()
      if (!/##[^#]{1,60}##/.test(c)) continue
      const col = Number(k)
      out.push({
        row: r,
        col,
        colspan: cell.colspan || 1,
        rowspan: cell.rowspan || 1,
        content: c,
        binding: cell.dataBinding || '',
        tapado: occ.has(`${r}-${col}`) || col >= (datos.totalCols || 0),
        esLogo: c.startsWith('##LOGO_'),
        esBgLogo: c.startsWith('##BGLOGO_'),
        renderizable: esTokenLogoRenderizable(c),
      })
    }
  }
  return out
}

function findLogo(datos: GridConfig): { row: number; col: number; colspan: number; token: string; visible: boolean } | null {
  const occ = computeOccupied(datos)
  for (let r = 0; r < (datos.rows || []).length; r++) {
    const row = datos.rows[r]
    if (!row) continue
    for (const [k, cell] of Object.entries(row.cells || {})) {
      const c = (cell.content || '').trim()
      if (!esTokenLogoRenderizable(c)) continue
      const col = Number(k)
      return {
        row: r,
        col,
        colspan: cell.colspan || 1,
        token: c,
        visible: !occ.has(`${r}-${col}`) && col < (datos.totalCols || 0),
      }
    }
  }
  return null
}

// ##LOGO_FOO_BAR## -> /logo-foo-bar.png  |  ##BGLOGO_FOO:contain## -> /logo-foo.png
function tokenAarchivo(content: string): string {
  const c = (content || '').trim()
  if (c.startsWith('##LOGO_') && c.endsWith('##')) {
    return `/logo-${c.slice(7, -2).trim().toLowerCase().replace(/_/g, '-')}.png`
  }
  if (c.startsWith('##BGLOGO_') && c.endsWith('##')) {
    return `/logo-${c.slice(9, -2).split(':')[0].trim().toLowerCase().replace(/_/g, '-')}.png`
  }
  return ''
}

// Prueba de archivos estáticos (mismo origen): true=200, false=404, null=red fallida
const probeCache = new Map<string, boolean | null>()
async function probeFile(file: string): Promise<boolean | null> {
  if (!file || file === '/') return null
  if (probeCache.has(file)) return probeCache.get(file) ?? null
  try {
    const r = await fetch(file)
    probeCache.set(file, r.ok)
    return r.ok
  } catch {
    probeCache.set(file, null)
    return null
  }
}

// Inserta el token en la grilla (mutación del JSON ya parseado):
// 1º posición de referencia (copiando su colspan si las vecinas están libres),
// 2º primera celda libre y visible de las primeras 8 filas.
// Antes limpia tokens TAPADOS del mismo tipo. Retorna dónde quedó o null.
function insertarLogo(datos: GridConfig, token: string, ref: { row: number; col: number; colspan: number } | null): string | null {
  const occ = computeOccupied(datos)
  const totalCols = datos.totalCols || 0
  for (let r = 0; r < (datos.rows || []).length; r++) {
    const row = datos.rows[r]
    if (!row) continue
    for (const [k, cell] of Object.entries(row.cells || {})) {
      const col = Number(k)
      if ((cell.content || '').trim() === token && (occ.has(`${r}-${col}`) || col >= totalCols)) {
        cell.content = ''
      }
    }
  }
  const setLogo = (cell: CellConfig) => {
    cell.content = token
    cell.dataBinding = ''
    cell.textAlign = 'center'
    cell.verticalAlign = 'middle'
  }
  const pos = ref ?? { row: 0, col: 0, colspan: 1 }
  const direct = (datos.rows || [])[pos.row]?.cells?.[pos.col]
  if (direct && !(direct.content || '').trim() && !occ.has(`${pos.row}-${pos.col}`) && pos.col < totalCols) {
    setLogo(direct)
    const cs = Math.max(1, pos.colspan || 1)
    if (cs > 1 && pos.col + cs <= totalCols) {
      const rowCells = (datos.rows || [])[pos.row].cells
      let libres = true
      for (let c = pos.col + 1; c < pos.col + cs; c++) {
        if ((rowCells[c]?.content || '').trim()) { libres = false; break }
      }
      if (libres) {
        direct.colspan = cs
        for (let c = pos.col + 1; c < pos.col + cs; c++) delete rowCells[c]
      }
    }
    return `fila ${pos.row + 1}, col ${pos.col + 1}` + ((direct.colspan || 1) > 1 ? ` (combina ${direct.colspan} columnas, igual que la referencia)` : '')
  }
  for (let r = 0; r < Math.min((datos.rows || []).length, 8); r++) {
    const row = datos.rows[r]
    if (!row) continue
    for (const [k, cell] of Object.entries(row.cells || {})) {
      const col = Number(k)
      if (!(cell.content || '').trim() && !occ.has(`${r}-${col}`) && col < totalCols) {
        setLogo(cell)
        return `fila ${r + 1}, col ${col + 1}`
      }
    }
  }
  return null
}

// ---------- Lectura de una ruta de la API con su ficha de identidad ----------

async function leerRuta(etiqueta: string, url: string): Promise<{ ruta: RutaInfo; lay: any }> {
  const r = await fetchJson(url)
  const lay = primerRegistro(r.data)
  const rutaBase = { etiqueta, url, status: r.status, ok: r.ok }
  if (!lay || typeof lay !== 'object') {
    const extra = Array.isArray(r.data) ? ` (llegó una lista de ${r.data.length} registros)` : ''
    return { ruta: { ...rutaBase, header: [`sin registro utilizable${extra}`], datosBytes: 0, datosOk: false }, lay: null }
  }
  const header: string[] = []
  for (const [k, v] of Object.entries(lay)) {
    if (k === 'datos') continue
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
    header.push(`${k}: ${val.length > 120 ? val.slice(0, 120) + '…' : val}`)
  }
  const datos = parseDatos(lay)
  const bytes = typeof lay.datos === 'string' ? lay.datos.length : (lay.datos !== undefined && lay.datos !== null ? JSON.stringify(lay.datos).length : 0)
  return {
    ruta: {
      ...rutaBase,
      id: lay.id,
      nombre: lay.nombre,
      metaPlan: datos ? ((datos as any).meta?.plan !== undefined ? String((datos as any).meta.plan) : '(sin meta.plan)') : undefined,
      header,
      datosBytes: bytes,
      datosOk: !!datos,
    },
    lay,
  }
}

// ---------- Componente principal ----------

function LogoDoctorContent() {
  const searchParams = useSearchParams()
  const urlLayout = searchParams.get('layout') || ''
  const urlPlan = searchParams.get('plan') === 'vigente' ? 'vigente' : 'derogado'
  const { toast } = useToast()

  const [layoutId, setLayoutId] = useState(urlLayout)
  const [plan, setPlan] = useState<'derogado' | 'vigente'>(urlPlan)
  const [diag, setDiag] = useState<Diagnostico | null>(null)
  const [diagnosticando, setDiagnosticando] = useState(false)
  const [reparando, setReparando] = useState<'este' | 'todos' | null>(null)
  const [ops, setOps] = useState<OpLog[]>([])

  const log = useCallback((nombre: string, status: OpStatus, detalle: string) => {
    setOps(prev => [{ ts: new Date().toLocaleTimeString(), nombre, status, detalle }, ...prev].slice(0, 80))
  }, [])

  // ==================== DIAGNÓSTICO (solo lectura) ====================
  const diagnosticar = useCallback(async (lid: string, pl: 'derogado' | 'vigente') => {
    if (!lid) {
      toast({ title: 'Falta el layout', description: 'Pega el ID del layout o elígelo de la lista del plan derogado.', variant: 'destructive' })
      return
    }
    setDiagnosticando(true)
    try {
      probeCache.clear()
      // 1. El MISMO layout por las dos rutas de la API
      const [q, p] = await Promise.all([
        leerRuta('?id= (la que usan cert-view y el editor)', `/api/cert-layouts?id=${lid}&plan=${pl}`),
        leerRuta('/{id} (la que usaba la reparación masiva)', `/api/cert-layouts/${lid}?plan=${pl}`),
      ])
      // 2. Listas de ambos planes
      const [lDer, lVig] = await Promise.all([
        fetchJson('/api/cert-layouts?plan=derogado'),
        fetchJson('/api/cert-layouts?plan=vigente'),
      ])
      const derList: SavedLayout[] = Array.isArray(lDer.data) ? lDer.data : []
      const vigList: SavedLayout[] = Array.isArray(lVig.data) ? lVig.data : []
      const enDer = derList.some(l => l.id === lid)
      const enVig = vigList.some(l => l.id === lid)
      // 3. Fuente principal: la ruta que usa cert-view
      const lay = q.lay ?? p.lay
      const datos = parseDatos(lay)
      const tokens = datos ? scanTokens(datos) : []
      const overlay = datos ? (datos.logoOverlay ?? null) : null
      // 4. Referencia: certificación vigente que SÍ muestra el logo
      let refToken: Referencia | null = null
      let refOverlay: Referencia | null = null
      for (const l of vigList.slice(0, 12)) {
        let rl = await fetchJson(`/api/cert-layouts/${l.id}?plan=vigente`)
        let rlay = primerRegistro(rl.data)
        if (!rlay?.id) { rl = await fetchJson(`/api/cert-layouts?id=${l.id}&plan=vigente`); rlay = primerRegistro(rl.data) }
        const rd = parseDatos(rlay)
        if (!rd) continue
        const logo = findLogo(rd)
        if (logo?.visible) {
          const file = tokenAarchivo(logo.token)
          refToken = { layout: l.nombre, token: logo.token, overlay: null, row: logo.row, col: logo.col, colspan: logo.colspan, file, fileOk: file ? await probeFile(file) : null }
          break
        }
        if (rd.logoOverlay?.name && !refOverlay) {
          const file = `/${rd.logoOverlay.name}`
          refOverlay = { layout: l.nombre, token: null, overlay: rd.logoOverlay.name, row: -1, col: -1, colspan: 1, file, fileOk: await probeFile(file) }
        }
      }
      const referencia = refToken ?? refOverlay
      // 5. Archivos de imagen: los de los tokens + overlay + referencia + fijos
      const cand = new Set<string>()
      for (const t of tokens) { const f = tokenAarchivo(t.content); if (f) cand.add(f) }
      if (overlay?.name) cand.add(`/${overlay.name}`)
      if (referencia?.file) cand.add(referencia.file)
      cand.add('/logo-cemg.png')
      cand.add('/logo-gob-mppe.png')
      cand.add('/Imagen2.png')
      const archivos: { file: string; ok: boolean | null }[] = []
      for (const f of cand) archivos.push({ file: f, ok: await probeFile(f) })
      // 6. Comparación entre rutas
      const datosQ = parseDatos(q.lay)
      const datosP = parseDatos(p.lay)
      const datosIguales = datosQ && datosP ? JSON.stringify(datosQ) === JSON.stringify(datosP) : null
      // 7. Hallazgos
      const hallazgos: Finding[] = []
      if (!lDer.ok) hallazgos.push({ nivel: 'error', titulo: 'La lista del plan derogado no respondió', detalle: `GET /api/cert-layouts?plan=derogado devolvió ${lDer.status}. Sin esa lista la reparación masiva no puede trabajar (pero «Reparar este layout» sí funciona, porque va directo por id).` })
      if (!lay) {
        hallazgos.push({ nivel: 'error', titulo: 'Ninguna ruta de la API pudo cargar este layout', detalle: `Se probó /api/cert-layouts?id=${lid}&plan=${pl} (status ${q.ruta.status}) y /api/cert-layouts/${lid}?plan=${pl} (status ${p.ruta.status}). Revisa que el id sea correcto y que la app responda.` })
      } else {
        const logo = datos ? findLogo(datos) : null
        if (!enDer && pl === 'derogado') {
          hallazgos.push({ nivel: 'error', titulo: 'Este layout está FUERA de la lista del plan derogado', detalle: `La lista /api/cert-layouts?plan=derogado trae ${derList.length} layouts y este id NO está entre ellos${enVig ? ' (en cambio SÍ aparece en la lista del plan VIGENTE)' : ' (tampoco está en la lista del plan vigente)'}. Por eso el botón «Reparar Derogados» de versiones anteriores jamás lo tocó: itera esa lista. El botón «Reparar este layout» de esta página sí lo repara porque va directo por id.` })
        }
        if (enVig && pl === 'derogado') {
          hallazgos.push({ nivel: 'warn', titulo: 'Este id también figura en el plan vigente', detalle: 'El mismo id aparece en la lista del plan vigente. Si el layout pertenece a la colección vigente pero se abre con plan=derogado, los guardados pueden caer en otra colección según cómo filtre la API. «Reparar este layout» guarda con exactamente la misma petición que el botón Guardar del editor.' })
        }
        if (datosIguales === false) {
          hallazgos.push({ nivel: 'error', titulo: 'Las dos rutas de la API devuelven datos DISTINTOS', detalle: 'GET ?id=... y GET /{id}... no devuelven el mismo JSON para este id. cert-view lee una y la reparación masiva antigua re-leía la otra: un cambio guardado por una vía podía no verse por la otra. La reparación de esta página verifica por AMBAS.' })
        }
        if (!datos) {
          hallazgos.push({ nivel: 'error', titulo: 'Los datos del layout no son una grilla válida', detalle: 'El registro llegó pero `datos` no tiene rows/totalCols. Puede estar corrupto o guardado en otro formato.' })
        } else if (logo && logo.visible) {
          const file = tokenAarchivo(logo.token)
          const okFile = file ? (archivos.find(a => a.file === file)?.ok ?? null) : null
          if (okFile === false) {
            hallazgos.push({ nivel: 'error', titulo: `El token está bien pero falta el archivo ${file}`, detalle: `La celda (fila ${logo.row + 1}, col ${logo.col + 1}) contiene ${logo.token}, pero al pedir ${file} el servidor responde 404: el <img> queda roto y el logo NO se ve ni en pantalla ni al imprimir aunque el token exista. Copia el PNG del logo a la carpeta public/ del proyecto con ese nombre exacto (así se llama el archivo que espera el render).` })
          } else {
            hallazgos.push({ nivel: 'ok', titulo: 'El logo está en los datos, visible y con archivo', detalle: `${logo.token} en fila ${logo.row + 1}, col ${logo.col + 1}${logo.colspan > 1 ? ` (combina ${logo.colspan} columnas)` : ''}${okFile ? ` y ${file} responde 200` : ''}. Si aún así no se ve en cert-view: recarga con Ctrl+Shift+R (caché) y verifica que la URL de cert-view use este mismo id de layout.` })
          }
        } else if (logo && !logo.visible) {
          hallazgos.push({ nivel: 'warn', titulo: 'El token del logo existe pero está TAPADO', detalle: `Hay ${logo.token} en fila ${logo.row + 1}, col ${logo.col + 1}, pero esa posición está cubierta por una celda combinada (colspan/rowspan) o fuera del ancho de la tabla: el render la salta y el logo jamás se pinta. «Reparar este layout» lo reubica en una celda visible.` })
        } else {
          const otros = tokens.filter(t => t.esLogo || t.esBgLogo)
          hallazgos.push({ nivel: 'error', titulo: 'Este layout NO tiene ningún token de logo en sus datos', detalle: `Se recorrieron ${(datos.rows || []).length} filas y no aparece ningún ##LOGO_...## renderizable${otros.length ? ` (solo hay: ${otros.map(t => t.content).join(', ')})` : ''}. El logo se perdió de los DATOS guardados: «Reparar este layout» lo re-inserta${referencia?.token ? ` con el mismo token que usa la referencia (${referencia.token})` : ''}.` })
        }
        const pisado = tokens.find(t => t.renderizable && t.binding)
        if (pisado) hallazgos.push({ nivel: 'warn', titulo: 'La celda del logo tiene un dataBinding que puede taparlo', detalle: `La celda (fila ${pisado.row + 1}, col ${pisado.col + 1}) tiene ${pisado.content} y ADEMÁS el binding «${pisado.binding}». Si ese binding resuelve texto, el texto reemplaza al logo (en cert-view eso ya está corregido en la v6, pero conviene limpiarlo). La reparación quita el binding.` })
        if (overlay?.name) hallazgos.push({ nivel: 'info', titulo: 'Este layout tiene membrete flotante (logoOverlay)', detalle: `Archivo /${overlay.name}, tamaño ${overlay.size ?? 15}%, posición ${overlay.position ?? 'top-left'}. Ese membrete es INDEPENDIENTE del logo del ministerio de las celdas.` })
      }
      if (referencia) {
        if (referencia.token) {
          hallazgos.push({ nivel: 'info', titulo: `Referencia: «${referencia.layout}» (vigente) muestra el logo así`, detalle: `Token ${referencia.token} en fila ${referencia.row + 1}, col ${referencia.col + 1}${referencia.colspan > 1 ? ` combinando ${referencia.colspan} columnas` : ''}${referencia.file ? `, archivo ${referencia.file} ${referencia.fileOk ? '(responde 200)' : '(NO responde: 404)'}` : ''}. La reparación copia exactamente ese mecanismo.` })
        } else {
          hallazgos.push({ nivel: 'warn', titulo: `Ningún layout vigente tiene logo por token; «${referencia.layout}» usa membrete flotante`, detalle: `Se revisaron los layouts vigentes y ninguno tiene un ##LOGO_...## visible. «${referencia.layout}» muestra /${referencia.overlay} como overlay flotante. Eso explicaría por qué insertar tokens en los derogados nunca reproduce el efecto de la referencia: el mecanismo que funciona es otro. La reparación usará ##LOGO_CEMG## como token por defecto.` })
        }
      } else if (lay) {
        hallazgos.push({ nivel: 'warn', titulo: 'No se encontró referencia en el plan vigente', detalle: 'Ninguna certificación vigente (de las primeras 12 de la lista) tiene logo por token ni membrete. La reparación usará ##LOGO_CEMG## en la esquina superior izquierda (verifica que /logo-cemg.png exista en public/).' })
      }
      // 8. Veredicto
      const primerError = hallazgos.find(h => h.nivel === 'error')
      const primerWarn = hallazgos.find(h => h.nivel === 'warn')
      const veredicto = primerError
        ? { nivel: 'error' as const, texto: `${primerError.titulo}. ${primerError.detalle}` }
        : primerWarn
          ? { nivel: 'warn' as const, texto: `${primerWarn.titulo}. ${primerWarn.detalle}` }
          : { nivel: 'ok' as const, texto: 'Todo lo que el logo necesita está en su sitio: token visible y archivo presente. Si aún no se ve en cert-view, es la caché del navegador (Ctrl+Shift+R) o el layout que abre cert-view no es este id.' }
      setDiag({
        layoutId: lid,
        plan: pl,
        byQuery: q.ruta,
        byPath: p.ruta,
        datosIguales,
        derTotal: derList.length,
        enDer,
        vigTotal: vigList.length,
        enVig,
        derNombres: derList.slice(0, 30),
        datos,
        tokens,
        overlay,
        archivos,
        referencia,
        hallazgos,
        veredicto,
      })
    } catch (e) {
      toast({ title: 'Error en el diagnóstico', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' })
    } finally {
      setDiagnosticando(false)
    }
  }, [toast])

  useEffect(() => {
    if (urlLayout) void diagnosticar(urlLayout, urlPlan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ==================== GUARDAR + VERIFICAR ====================

  const guardar = async (id: string, pl: string, lay: any, datos: GridConfig): Promise<{ ok: boolean; detalle: string }> => {
    const body = JSON.stringify({ nombre: lay.nombre, datos: { ...datos, meta: { ...((datos as any).meta || {}), plan: pl } } })
    let put: Response
    try {
      put = await fetch(`/api/cert-layouts?id=${id}&plan=${pl}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
    } catch (e) {
      return { ok: false, detalle: `fetch del PUT falló (¿se cayó el servidor?): ${e instanceof Error ? e.message : 'error de red'}` }
    }
    if (!put.ok) {
      const txt = (await put.text().catch(() => '')).slice(0, 300)
      return { ok: false, detalle: `PUT respondió ${put.status}${txt ? ` — ${txt}` : ''}` }
    }
    return { ok: true, detalle: '' }
  }

  const verificar = async (id: string, pl: string): Promise<{ okQuery: boolean; okPath: boolean }> => {
    const [vq, vp] = await Promise.all([
      fetchJson(`/api/cert-layouts?id=${id}&plan=${pl}`),
      fetchJson(`/api/cert-layouts/${id}?plan=${pl}`),
    ])
    const dq = parseDatos(primerRegistro(vq.data))
    const dp = parseDatos(primerRegistro(vp.data))
    return { okQuery: dq ? !!findLogo(dq)?.visible : false, okPath: dp ? !!findLogo(dp)?.visible : false }
  }

  // ==================== REPARAR ESTE LAYOUT ====================
  const repararEste = async () => {
    if (!diag || !layoutId) return
    setReparando('este')
    try {
      const pl = plan
      let rl = await fetchJson(`/api/cert-layouts/${layoutId}?plan=${pl}`)
      let lay = primerRegistro(rl.data)
      let fuente = '/{id}'
      if (!lay?.id) { rl = await fetchJson(`/api/cert-layouts?id=${layoutId}&plan=${pl}`); lay = primerRegistro(rl.data); fuente = '?id=' }
      const nombre = lay?.nombre || layoutId
      if (!lay?.id) { log(nombre, 'error', 'No se pudo cargar el layout por ninguna de las dos rutas de la API'); toast({ title: 'Error', description: 'No se pudo cargar el layout desde la BD.', variant: 'destructive' }); return }
      const datos = parseDatos(lay)
      if (!datos) { log(nombre, 'error', 'Los datos del layout no son una grilla válida (sin rows/totalCols)'); toast({ title: 'Error', description: 'Datos ilegibles: no se puede reparar este layout.', variant: 'destructive' }); return }
      const token = diag.referencia?.token || '##LOGO_CEMG##'
      const refPos = diag.referencia?.token ? { row: diag.referencia.row, col: diag.referencia.col, colspan: diag.referencia.colspan } : null
      const fileToken = tokenAarchivo(token)
      const fileOk = fileToken ? await probeFile(fileToken) : null
      if (fileOk === false) {
        log(nombre, 'error', `NO se reparó: el token a insertar (${token}) apunta a ${fileToken} que responde 404. Falta ese archivo en public/: copia el PNG con ese nombre exacto y vuelve a intentar. Ningún cambio de datos arregla un archivo que no existe.`)
        toast({ title: 'Falta el archivo', description: `${fileToken} no existe (404). Cópialo a la carpeta public/ del proyecto y vuelve a intentar.`, variant: 'destructive' })
        return
      }
      const idGuardar = lay.id || layoutId
      const logo = findLogo(datos)
      let donde: string | null = null
      if (logo?.visible) {
        const f = tokenAarchivo(logo.token)
        const fOk = f ? await probeFile(f) : null
        const cell = datos.rows[logo.row]?.cells?.[logo.col]
        const bindingViejo = cell?.dataBinding || ''
        if (fOk !== false && !bindingViejo) {
          log(nombre, 'ya-tenia', `El logo ya está visible: ${logo.token} en fila ${logo.row + 1}, col ${logo.col + 1} y su archivo ${f} responde 200. No había nada que reparar. Si no se ve en cert-view: Ctrl+Shift+R y comprobar el id de la URL.`)
          toast({ title: 'Ya está bien', description: 'El logo está en los datos y su archivo existe — no había nada que reparar.' })
          return
        }
        if (cell) {
          if (fOk === false) {
            const previo = cell.content
            cell.content = token
            cell.dataBinding = ''
            donde = `fila ${logo.row + 1}, col ${logo.col + 1} (se sustituyó ${previo}: su archivo ${f} responde 404)`
          } else {
            cell.dataBinding = ''
            donde = `fila ${logo.row + 1}, col ${logo.col + 1} (se quitó el binding «${bindingViejo}» que podía pisar el logo al imprimir)`
          }
        }
      }
      if (!donde) {
        donde = insertarLogo(datos, token, refPos)
        if (!donde) {
          log(nombre, 'manual', 'Sin celda libre visible en la zona superior: ábrelo en el editor (certificaciones-visual), selecciona la celda del logo y usa el botón esmeralda Restaurar Logo + Guardar.')
          toast({ title: 'Reparación manual', description: 'No hay celda libre arriba: usa Restaurar Logo en el editor con la celda seleccionada.', variant: 'destructive' })
          return
        }
      }
      const g = await guardar(idGuardar, pl, lay, datos)
      if (!g.ok) {
        log(nombre, 'error', `Guardado fallido — ${g.detalle}`)
        toast({ title: 'Error al guardar', description: g.detalle.slice(0, 180), variant: 'destructive' })
        return
      }
      const v = await verificar(idGuardar, pl)
      if (!v.okQuery && !v.okPath) {
        log(nombre, 'no-persistio', `Se insertó ${token} en ${donde} (vía ${fuente}) y el PUT respondió OK, pero al re-leer por AMBAS rutas sigue sin aparecer: la API no está persistiendo el cambio.`)
        toast({ title: 'No persistió', description: 'El PUT dijo OK pero la BD no guardó el cambio — revisa el registro de operaciones.', variant: 'destructive' })
        return
      }
      log(nombre, 'reparado', `${token} en ${donde} — guardado vía ${fuente} y verificado re-leyendo la BD (${v.okQuery ? '?id= OK' : '?id= FALLÓ'}, ${v.okPath ? '/{id} OK' : '/{id} FALLÓ'})`)
      toast({ title: 'Reparado', description: `Logo insertado en ${donde} y verificado. Vuelve a abrir cert-view para confirmarlo.` })
    } finally {
      setReparando(null)
    }
    await diagnosticar(layoutId, plan)
  }

  // ==================== REPARAR TODOS LOS DEROGADOS ====================
  const repararTodos = async () => {
    if (!diag) return
    setReparando('todos')
    try {
      const pl = 'derogado'
      const lDer = await fetchJson('/api/cert-layouts?plan=derogado')
      const derList: SavedLayout[] = Array.isArray(lDer.data) ? lDer.data : []
      if (derList.length === 0) { log('—', 'error', 'La lista del plan derogado vino vacía: no hay nada que reparar (revisa la sección Listas).'); return }
      const ids = derList.map(l => l.id)
      const nombres = new Map(derList.map(l => [l.id, l.nombre]))
      if (layoutId && !ids.includes(layoutId)) { ids.unshift(layoutId); nombres.set(layoutId, `${layoutId} (HUÉRFANO: no estaba en la lista y por eso la reparación masiva anterior jamás lo tocó)`) }
      const token = diag.referencia?.token || '##LOGO_CEMG##'
      const refPos = diag.referencia?.token ? { row: diag.referencia.row, col: diag.referencia.col, colspan: diag.referencia.colspan } : null
      const fileToken = tokenAarchivo(token)
      const fileOk = fileToken ? await probeFile(fileToken) : null
      if (fileOk === false) {
        log('—', 'error', `Abortado: el token a insertar (${token}) apunta a ${fileToken} que responde 404. Falta el archivo en public/: ningún cambio de datos lo arregla hasta copiar ese PNG.`)
        toast({ title: 'Falta el archivo', description: `${fileToken} no existe (404). Cópialo a public/ y vuelve a intentar.`, variant: 'destructive' })
        return
      }
      let nRep = 0, nYa = 0, nNo = 0, nErr = 0, nMan = 0
      for (const id of ids) {
        const nombre = nombres.get(id) || id
        try {
          let rl = await fetchJson(`/api/cert-layouts/${id}?plan=${pl}`)
          let lay = primerRegistro(rl.data)
          if (!lay?.id) { rl = await fetchJson(`/api/cert-layouts?id=${id}&plan=${pl}`); lay = primerRegistro(rl.data) }
          if (!lay?.id) { nErr++; log(nombre, 'error', 'No se pudo cargar desde la BD por ninguna ruta'); continue }
          const datos = parseDatos(lay)
          if (!datos) { nErr++; log(nombre, 'error', 'Datos ilegibles (sin rows/totalCols)'); continue }
          const logo = findLogo(datos)
          let donde: string | null = null
          if (logo?.visible) {
            const f = tokenAarchivo(logo.token)
            const fOk = f ? await probeFile(f) : null
            const cell = datos.rows[logo.row]?.cells?.[logo.col]
            const bindingViejo = cell?.dataBinding || ''
            if (fOk !== false && !bindingViejo) { nYa++; log(nombre, 'ya-tenia', `Logo visible (${logo.token}) en fila ${logo.row + 1}, col ${logo.col + 1} — no se tocó`); continue }
            if (cell) {
              if (fOk === false) {
                const previo = cell.content
                cell.content = token
                cell.dataBinding = ''
                donde = `fila ${logo.row + 1}, col ${logo.col + 1} (se sustituyó ${previo}: su archivo ${f} responde 404)`
              } else {
                cell.dataBinding = ''
                donde = `fila ${logo.row + 1}, col ${logo.col + 1} (se quitó el binding «${bindingViejo}» que podía pisar el logo)`
              }
            }
          }
          if (!donde) {
            donde = insertarLogo(datos, token, refPos)
            if (!donde) { nMan++; log(nombre, 'manual', 'Sin celda libre visible en la zona superior: usar Restaurar Logo en el editor'); continue }
          }
          const g = await guardar(id, pl, lay, datos)
          if (!g.ok) { nErr++; log(nombre, 'error', g.detalle); continue }
          const v = await verificar(id, pl)
          if (!v.okQuery && !v.okPath) { nNo++; log(nombre, 'no-persistio', `Se insertó en ${donde} y el PUT respondió OK, pero al re-leer NO aparece: la API no está persistiendo el cambio`); continue }
          nRep++
          log(nombre, 'reparado', `${token} en ${donde} — verificado re-leyendo la BD (${v.okQuery ? '?id= OK' : '?id= FALLÓ'}, ${v.okPath ? '/{id} OK' : '/{id} FALLÓ'})`)
        } catch (e) {
          nErr++
          log(nombre, 'error', e instanceof Error ? e.message : 'Error desconocido')
        }
      }
      toast({ title: 'Reparación terminada', description: `${nRep} reparados · ${nYa} ya tenían · ${nMan} manual · ${nNo} no persistieron · ${nErr} errores. Detalle en el registro de operaciones.` })
    } finally {
      setReparando(null)
    }
    if (layoutId) await diagnosticar(layoutId, plan)
  }

  // ==================== RENDER ====================

  const badgeOps: Record<OpStatus, { label: string; cls: string }> = {
    reparado: { label: 'REPARADO', cls: 'bg-emerald-100 text-emerald-800' },
    ok: { label: 'OK', cls: 'bg-emerald-100 text-emerald-800' },
    'ya-tenia': { label: 'YA TENÍA', cls: 'bg-gray-100 text-gray-600' },
    manual: { label: 'MANUAL', cls: 'bg-amber-100 text-amber-800' },
    'no-persistio': { label: 'NO PERSISTIÓ', cls: 'bg-red-100 text-red-700' },
    error: { label: 'ERROR', cls: 'bg-red-100 text-red-700' },
  }
  const iconoHallazgo = (nivel: Finding['nivel']) =>
    nivel === 'error' ? <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
    : nivel === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
    : nivel === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
    : <Activity className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Encabezado + selector */}
        <div className="bg-white rounded-lg border p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            <h1 className="text-lg font-bold text-slate-900">Doctor del logo — Certificaciones</h1>
          </div>
          <p className="text-sm text-slate-600">
            Lee el layout directamente de la base de datos y muestra la verdad sobre el logo: tokens en las celdas,
            archivos de imagen, pertenencia a las listas de cada plan y las dos rutas de la API. Primero diagnostica
            (solo lectura), luego repara con evidencia. Los cambios se guardan con la misma petición que usa el botón
            Guardar del editor y se verifican re-leyendo la BD.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={layoutId}
              onChange={e => setLayoutId(e.target.value.trim())}
              placeholder="ID del layout (ej. cmsj1rx4i0004po90x67iovoj)"
              className="flex-1 min-w-[240px] h-9 px-3 rounded-md border border-slate-300 text-sm text-slate-900 bg-white"
            />
            <select
              value={plan}
              onChange={e => setPlan(e.target.value as 'derogado' | 'vigente')}
              className="h-9 px-2 rounded-md border border-slate-300 text-sm text-slate-900 bg-white"
            >
              <option value="derogado">plan derogado</option>
              <option value="vigente">plan vigente</option>
            </select>
            <Button size="sm" onClick={() => { probeCache.clear(); void diagnosticar(layoutId, plan) }} disabled={diagnosticando || !layoutId}>
              {diagnosticando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Diagnosticar
            </Button>
          </div>
        </div>

        {diagnosticando && (
          <div className="bg-white rounded-lg border p-6 shadow-sm flex items-center justify-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Leyendo la base de datos y probando archivos…
          </div>
        )}

        {diag && !diagnosticando && (
          <>
            {/* VEREDICTO */}
            <div className={`rounded-lg border p-4 ${diag.veredicto.nivel === 'error' ? 'bg-red-50 border-red-200' : diag.veredicto.nivel === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-start gap-2">
                {diag.veredicto.nivel === 'error' ? <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" /> : diag.veredicto.nivel === 'warn' ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
                <div>
                  <div className="text-sm font-bold text-slate-900">VEREDICTO del layout «{diag.byQuery?.nombre || diag.byPath?.nombre || diag.layoutId}»</div>
                  <p className="text-sm text-slate-700 mt-1">{diag.veredicto.texto}</p>
                </div>
              </div>
            </div>

            {/* HALLAZGOS */}
            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
              <div className="text-sm font-bold text-slate-900">Hallazgos ({diag.hallazgos.length})</div>
              {diag.hallazgos.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm border-b pb-2 last:border-b-0">
                  {iconoHallazgo(h.nivel)}
                  <div>
                    <div className={`font-semibold ${h.nivel === 'error' ? 'text-red-700' : h.nivel === 'warn' ? 'text-amber-700' : h.nivel === 'ok' ? 'text-emerald-700' : 'text-slate-800'}`}>{h.titulo}</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{h.detalle}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ACCIONES */}
            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
              <div className="text-sm font-bold text-slate-900">Acciones</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={repararEste} disabled={!diag.datos || reparando !== null || diagnosticando}>
                  {reparando === 'este' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />} Reparar este layout
                </Button>
                <Button size="sm" variant="outline" onClick={repararTodos} disabled={reparando !== null || diagnosticando}>
                  {reparando === 'todos' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />} Reparar todos los derogados
                </Button>
                <Button size="sm" variant="outline" onClick={() => { probeCache.clear(); void diagnosticar(layoutId, plan) }} disabled={diagnosticando || !layoutId}>
                  {diagnosticando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Re-diagnosticar
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                «Reparar todos» recorre la lista del plan derogado y ADEMÁS incluye este layout aunque no esté en la
                lista (huérfano) — exactamente el caso que las reparaciones masivas anteriores no podían alcanzar.
              </p>
            </div>

            {/* RUTAS DE LA API */}
            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
              <div className="text-sm font-bold text-slate-900">Identidad del layout en las dos rutas de la API</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-1 pr-2">Ruta probada</th><th>HTTP</th><th>id</th><th>nombre</th><th>meta.plan</th><th>datos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[diag.byQuery, diag.byPath].map((r: RutaInfo | null) => r && (
                      <tr key={r.etiqueta} className="border-b text-slate-700">
                        <td className="py-1 pr-2 font-mono">{r.url}</td>
                        <td>{r.status}</td>
                        <td className="font-mono">{r.id || '—'}</td>
                        <td>{r.nombre || '—'}</td>
                        <td>{r.metaPlan || '—'}</td>
                        <td>{r.datosOk ? `${r.datosBytes.toLocaleString('es-VE')} bytes` : 'ilegibles'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {diag.datosIguales !== null && (
                <p className={`text-xs ${diag.datosIguales ? 'text-emerald-700' : 'text-red-700 font-bold'}`}>
                  {diag.datosIguales ? 'Ambas rutas devuelven los MISMOS datos.' : 'ATENCIÓN: las dos rutas devuelven datos DIFERENTES para el mismo id.'}
                </p>
              )}
              {diag.byQuery?.header?.length ? (
                <details>
                  <summary className="text-xs cursor-pointer text-slate-500">Campos del registro (sin datos)</summary>
                  <pre className="text-[10px] mt-1 bg-slate-50 rounded p-2 overflow-x-auto">{diag.byQuery.header.join('\n')}</pre>
                </details>
              ) : null}
            </div>

            {/* LISTAS */}
            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
              <div className="text-sm font-bold text-slate-900">Pertenencia a las listas de cada plan</div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${diag.enDer ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{diag.enDer ? 'SÍ está' : 'NO está'}</span>
                  en la lista derogada ({diag.derTotal} layouts)
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${diag.enVig ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{diag.enVig ? 'también está' : 'no está'}</span>
                  en la lista vigente ({diag.vigTotal} layouts)
                </div>
              </div>
              {diag.derNombres.length > 0 && (
                <details>
                  <summary className="text-xs cursor-pointer text-slate-500">Elegir otro layout del plan derogado ({diag.derNombres.length} de {diag.derTotal})</summary>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {diag.derNombres.map(l => (
                      <button key={l.id} onClick={() => { setLayoutId(l.id); setPlan('derogado'); void diagnosticar(l.id, 'derogado') }} className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700">
                        {l.nombre}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* TOKENS */}
            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
              <div className="text-sm font-bold text-slate-900">Tokens ##...## en las celdas ({diag.tokens.length})</div>
              {diag.tokens.length === 0 ? (
                <p className="text-xs text-slate-500">No hay ningún token en este layout.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-1 pr-2">Celda</th><th>Contenido</th><th>combina</th><th>¿tapado?</th><th>binding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diag.tokens.map((t, i) => (
                        <tr key={i} className="border-b text-slate-700">
                          <td className="py-1 pr-2">fila {t.row + 1}, col {t.col + 1}</td>
                          <td className="font-mono">{t.content}</td>
                          <td>{t.colspan > 1 ? `${t.colspan} col` : '—'}{t.rowspan > 1 ? ` / ${t.rowspan} filas` : ''}</td>
                          <td>{t.tapado ? <span className="text-red-700 font-semibold">TAPADO</span> : <span className="text-emerald-700">visible</span>}</td>
                          <td className="font-mono">{t.binding || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ARCHIVOS */}
            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
              <div className="text-sm font-bold text-slate-900">Archivos de imagen probados</div>
              <div className="flex flex-wrap gap-2">
                {diag.archivos.map(a => (
                  <span key={a.file} className={`px-2 py-1 rounded text-xs font-mono ${a.ok === true ? 'bg-emerald-100 text-emerald-800' : a.ok === false ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.file} {a.ok === true ? '200' : a.ok === false ? '404' : '?'}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500">200 = el archivo existe en public/. 404 = falta: un token que apunte a un archivo 404 produce un logo invisible aunque el token esté perfecto.</p>
            </div>

            {/* REFERENCIA */}
            {diag.referencia && (
              <div className="bg-white rounded-lg border p-4 shadow-sm space-y-1">
                <div className="text-sm font-bold text-slate-900">Referencia (certificación vigente que sí muestra logo)</div>
                <p className="text-sm text-slate-700">
                  «{diag.referencia.layout}»: {diag.referencia.token
                    ? <>token <span className="font-mono">{diag.referencia.token}</span> en fila {diag.referencia.row + 1}, col {diag.referencia.col + 1}{diag.referencia.colspan > 1 ? ` (combina ${diag.referencia.colspan} columnas)` : ''}, archivo <span className="font-mono">{diag.referencia.file}</span> {diag.referencia.fileOk ? '(responde 200)' : '(404 — ¡no existe!)'}</>
                    : <>solo membrete flotante <span className="font-mono">/{diag.referencia.overlay}</span> {diag.referencia.fileOk ? '(responde 200)' : '(404)'}</>}
                </p>
              </div>
            )}

            {/* MINI-MAPA */}
            {diag.datos && (
              <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
                <div className="text-sm font-bold text-slate-900">Mini-mapa de las primeras {Math.min((diag.datos.rows || []).length, 8)} filas</div>
                <MiniMapa datos={diag.datos} />
              </div>
            )}

            {/* REGISTRO DE OPERACIONES */}
            {ops.length > 0 && (
              <div className="bg-white rounded-lg border p-4 shadow-sm space-y-2">
                <div className="text-sm font-bold text-slate-900">Registro de operaciones</div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {ops.map((o, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs border-b pb-1">
                      <span className="text-slate-400 font-mono shrink-0">{o.ts}</span>
                      <span className={`px-1.5 py-0.5 rounded font-semibold shrink-0 ${badgeOps[o.status].cls}`}>{badgeOps[o.status].label}</span>
                      <span className="font-medium text-slate-800 shrink-0 max-w-[220px] truncate" title={o.nombre}>{o.nombre}</span>
                      <span className="text-slate-600 break-words min-w-0">{o.detalle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON CRUDO */}
            {diag.datos && (
              <details className="bg-white rounded-lg border p-4 shadow-sm">
                <summary className="text-sm font-bold text-slate-900 cursor-pointer">JSON crudo del layout (tal cual está guardado en la BD)</summary>
                <pre className="text-[10px] leading-3 mt-2 bg-slate-50 rounded p-2 overflow-auto max-h-96">{JSON.stringify(diag.datos, null, 1).slice(0, 60000)}</pre>
              </details>
            )}
          </>
        )}

        {!diag && !diagnosticando && (
          <div className="bg-white rounded-lg border p-6 shadow-sm text-center text-sm text-slate-600">
            Pega el ID del layout (o ábrelo con <span className="font-mono">?layout=...&amp;plan=derogado</span> en la URL)
            y pulsa Diagnosticar. Para el caso de la hoja III ETAPA BASICA usa:
            <div className="font-mono text-xs mt-2 bg-slate-50 rounded p-2 break-all">/cert-logo-doctor?layout=cmsj1rx4i0004po90x67iovoj&amp;plan=derogado</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// Mini-mapa: primeras filas de la grilla con el mismo criterio de celdas tapadas del render
function MiniMapa({ datos }: { datos: GridConfig }) {
  const occ = useMemo(() => computeOccupied(datos), [datos])
  const filas = Math.min((datos.rows || []).length, 8)
  const cols = datos.totalCols || 0
  const filasHtml: React.ReactNode[] = []
  for (let r = 0; r < filas; r++) {
    const celdas: React.ReactNode[] = []
    for (let c = 0; c < cols; c++) {
      const cell = datos.rows[r]?.cells?.[c]
      const cont = (cell?.content || '').trim()
      const covered = occ.has(`${r}-${c}`)
      const esLogo = esTokenLogoRenderizable(cont)
      const bg = esLogo && !covered ? '#86efac' : esLogo && covered ? '#fca5a5' : covered ? '#fecaca' : cont ? '#cbd5e1' : '#f8fafc'
      celdas.push(
        <td key={c} title={`Fila ${r + 1}, col ${c + 1}${cont ? `: ${cont.slice(0, 50)}` : ' (vacía)'}`} style={{ width: 13, height: 13, border: '1px solid #94a3b8', background: bg, padding: 0 }} />
      )
    }
    filasHtml.push(<tr key={r}>{celdas}</tr>)
  }
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: 'collapse' }}><tbody>{filasHtml}</tbody></table>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#86efac' }} /> logo visible</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#fca5a5' }} /> logo tapado</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#fecaca' }} /> tapada por combinación</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#cbd5e1' }} /> con contenido</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f8fafc' }} /> libre</span>
      </div>
    </div>
  )
}

export default function CertLogoDoctorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <LogoDoctorContent />
    </Suspense>
  )
}
