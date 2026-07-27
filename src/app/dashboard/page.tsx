'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'

const INIT_COLS = 40
const INIT_ROWS = 51

type Align = 'left' | 'center' | 'right'
interface Merge { sr: number; sc: number; er: number; ec: number }
interface CmdButton {
  sr: number; sc: number; label: string; color: string; bgColor: string; fontSize: number
  disabledColor?: string; activeColor?: string; requiresEdit?: boolean; disableOnEdit?: boolean
  hoverColor1?: string; hoverColor2?: string; hoverShadowColor?: string; downShadowColor?: string
  mergeSpan?: { er: number; ec: number }
}

const FONTS = [
  'Arial','Verdana','Tahoma','Georgia','Times New Roman',
  'Courier New','Trebuchet MS','Lucida Console','Impact','Comic Sans MS'
]

function makeEmpty2D<T>(rows: number, cols: number, fill: T): T[][] {
  const a: T[][] = []
  for (let r = 0; r < rows; r++) { a[r] = []; for (let c = 0; c < cols; c++) a[r][c] = fill }
  return a
}

function makeInitialCells(): string[][] {
  const c = makeEmpty2D(INIT_ROWS, INIT_COLS, '')
  c[0][0] = 'AGREGAR DATOS, NOTAS Y OBSERVACIONES PARA CERTIFICACION DE CALIFICACIONES EMG 31059 - CONSTANCIA - BOLETIN - VALIDACION DE TITULO Y NOTAS'
  c[1][0] = 'DATOS PERSONALES'; c[1][7] = 'CIRCULAR N 05, (02/07/2003) (modificada al 30/03/2007)'
  c[2][0] = 'CEDULA:'; c[3][0] = 'FECHA DE NACIMIENTO:'; c[4][0] = 'APELLIDOS:'
  c[5][0] = 'NOMBRES:'; c[6][0] = 'PAIS DE NACIMIENTO:'; c[6][1] = 'VENEZUELA'
  c[7][0] = 'ESTADO:'; c[8][0] = 'MUNICIPIO:'
  c[9][0] = 'Programacion y Diseno por Juan C. Orellana R.'
  c[11][0] = 'N'; c[11][1] = 'NOMBRE DEL PLANTEL'; c[11][2] = 'LOCALIDAD'; c[11][3] = 'E.F.'
  c[11][4] = 'PRIMER AO'; c[11][10] = 'SEGUNDO AO'; c[11][16] = 'SECCION'
  c[12][4] = 'AREAS DE FORMACION'; c[12][5] = 'NOTA'; c[12][6] = 'T-E'; c[12][7] = 'FECHA'; c[12][8] = 'PLANTEL'
  c[12][10] = 'AREAS DE FORMACION'; c[12][11] = 'NOTA'; c[12][12] = 'T-E'; c[12][13] = 'FECHA'; c[12][14] = 'PLANTEL'
  c[12][16] = 'AREAS'; c[12][17] = 'OC'; c[12][18] = 'PG'
  const m1 = ['Castellano', 'Matematicas', 'Educacion Fisica', 'Arte y Patrimonio', 'Ciencias Naturales']
  const m2 = ['Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Arte y Patrimonio', 'Ciencias Naturales']
  for (let i = 0; i < 5; i++) { c[13+i][0] = String(i+1); c[13+i][4] = m1[i]; c[13+i][10] = m2[i] }
  c[17][0] = 'TERCER AO'; c[17][4] = 'SECCION'; c[17][6] = 'AREAS DE FORMACION'; c[17][7] = 'NOTA'
  c[17][8] = 'T-E'; c[17][9] = 'FECHA'; c[17][10] = 'PLANTEL'; c[17][11] = 'CUARTO AO'
  c[17][15] = 'SECCION'; c[17][17] = 'AREAS DE FORMACION'; c[17][18] = 'NOTA'; c[17][19] = 'T-E'
  c[17][20] = 'FECHA'; c[17][21] = 'PLANTEL'; c[17][22] = 'QUINTO AO'; c[17][26] = 'SECCION'
  c[17][28] = 'AREAS DE FORMACION'; c[17][29] = 'NOTA'; c[17][30] = 'T-E'; c[17][31] = 'FECHA'
  c[17][32] = 'PLANTEL'; c[17][33] = 'GRUPO'
  const m3 = ['Castellano','Ingles y otras Len. Extranj.','Matematicas','Educacion Fisica','Fisica','Quimica','Biologia','Geografia, Hist. y Ciudad.','Form. para la Sober. Nal.']
  const m4 = ['Ingles y otras Len. Extranj.','Matematicas','Educacion Fisica','Fisica','Quimica','Biologia','Geografia, Hist. y Ciudad.','Form. para la Sober. Nal.']
  const m5 = ['Castellano','Ingles y otras Len. Extranj.','Matematicas','Educacion Fisica','Fisica','Quimica','Ciencias de la Tierra','Geografia, Hist. y Ciudad.']
  for (let i = 0; i < 9; i++) {
    if (i < m3.length) c[18+i][6] = m3[i]
    if (i < m4.length) c[18+i][17] = m4[i]
    if (i < m5.length) c[18+i][28] = m5[i]
  }
  c[26][0] = 'VALIDACION TITULO / NOTAS'; c[26][1] = 'VALIDACION TITULO / NOTAS'
  c[26][2] = 'Serial T.'; c[26][3] = 'Fecha Emision T.'; c[26][4] = 'Ao Egreso T.'
  c[26][5] = 'Fecha Emision N.'; c[26][6] = 'Promedio Total'; c[26][7] = '*'
  c[27][0] = 'Observaciones:'
  return c
}

function makeInitialWidths(): number[] {
  const w = [30,160,80,30, 130,40,30,30,50,100, 130,40,30,30,50,100, 40,130,40,30, 130,40,30,30,50,100, 40,130,40,30, 30,50,100, 40,130,40,30,30,50,100]
  while (w.length < INIT_COLS) w.push(80)
  return w
}

function makeInitialHeights(rows: number): number[] {
  const h: number[] = []
  for (let r = 0; r < rows; r++) h[r] = r <= 1 ? 28 : r <= 11 ? 22 : 20
  return h
}

function makeInitialBg(rows: number, cols: number): string[][] {
  const b = makeEmpty2D(rows, cols, '#ffffff')
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r===0) b[r][c]='#0080ff'; else if (r===1) b[r][c]='#b3d9ff'; else if (r>=2&&r<=11) b[r][c]='#ffffcc'
    else if (r===12||r===17) b[r][c]='#b3d9ff'; else if (r>=13&&r<=25) b[r][c]='#ffffcc'
    else if (r===26) b[r][c]='#b3d9ff'; else if (r===27) b[r][c]='#ffffcc'
  }
  return b
}

function makeInitialAlign(rows: number, cols: number): Align[][] {
  const a = makeEmpty2D<Align>(rows, cols, 'left')
  for (let r = 0; r < rows; r++) a[r][0] = 'center'
  for (let r = 2; r <= 8; r++) a[r][0] = 'right'
  return a
}

function makeInitialFontFamilies(rows: number, cols: number): string[][] {
  return makeEmpty2D(rows, cols, 'Arial')
}

function makeInitialFontSizes(rows: number, cols: number): number[][] {
  return makeEmpty2D(rows, cols, 9)
}

function makeInitialFontColors(rows: number, cols: number): string[][] {
  const fc = makeEmpty2D(rows, cols, '#333333')
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === 0) fc[r][c] = 'white'
    else if ([1,12,17,26].includes(r)) fc[r][c] = '#003366'
  }
  return fc
}

function makeInitialBorders(rows: number, cols: number): boolean[][] {
  return makeEmpty2D(rows, cols, false)
}

// localStorage persistence
const STORAGE_KEY = (plan: string) => `jo-sigae-dashboard-${plan}`

interface SheetState {
  numRows: number; numCols: number
  cells: string[][]; colWidths: number[]; rowHeights: number[]
  bgColors: string[][]; textAligns: Align[][]; merges: Merge[]
  fontFamilies: string[][]; fontSizes: number[][]; fontColors: string[][]
  borders: boolean[][]; boldCells: boolean[][]
}

function readSavedOnce(plan: string): SheetState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY(plan))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/** Cargar estado desde la base de datos (fuente principal) */
async function loadFromDb(plan: string): Promise<SheetState | null> {
  try {
    const res = await fetch(`/api/dashboard-state?plan=${plan}`)
    const data = await res.json()
    if (data.found && data.datos) {
      return typeof data.datos === 'string' ? JSON.parse(data.datos) : data.datos
    }
    return null
  } catch { return null }
}

/** Guardar estado en la base de datos */
async function saveToDb(plan: string, state: SheetState): Promise<boolean> {
  try {
    await fetch('/api/dashboard-state?plan=' + plan, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos: state }),
    })
    return true
  } catch { return false }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SheetEditor – manages its own state, loads/saves from localStorage[plan]  */
/* ─────────────────────────────────────────────────────────────────────────── */

function SheetEditor({ plan, onSwitchPlan }: { plan: string; onSwitchPlan: () => void }) {
  const [totalRecords, setTotalRecords] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [dbLoaded, setDbLoaded] = useState(false)

  // Caché localStorage como respaldo inmediato (carga rápida)
  const _saved = useRef(readSavedOnce(plan))
  const sv = _saved.current

  const [numRows, setNumRows] = useState(sv?.numRows ?? INIT_ROWS)
  const [numCols, setNumCols] = useState(sv?.numCols ?? INIT_COLS)
  const [cells, setCells] = useState<string[][]>(() => sv?.cells ?? makeInitialCells())
  const [colWidths, setColWidths] = useState<number[]>(() => sv?.colWidths ?? makeInitialWidths())
  const [rowHeights, setRowHeights] = useState<number[]>(() => sv?.rowHeights ?? makeInitialHeights(INIT_ROWS))
  const [bgColors, setBgColors] = useState<string[][]>(() => sv?.bgColors ?? makeInitialBg(INIT_ROWS, INIT_COLS))
  const [textAligns, setTextAligns] = useState<Align[][]>(() => sv?.textAligns ?? makeInitialAlign(INIT_ROWS, INIT_COLS))
  const [fontFamilies, setFontFamilies] = useState<string[][]>(() => sv?.fontFamilies ?? makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
  const [fontSizes, setFontSizes] = useState<number[][]>(() => sv?.fontSizes ?? makeInitialFontSizes(INIT_ROWS, INIT_COLS))
  const [fontColors, setFontColors] = useState<string[][]>(() => sv?.fontColors ?? makeInitialFontColors(INIT_ROWS, INIT_COLS))
  const [borders, setBorders] = useState<boolean[][]>(() => sv?.borders ?? makeInitialBorders(INIT_ROWS, INIT_COLS))
  const [boldCells, setBoldCells] = useState<boolean[][]>(() => {
    if (sv?.boldCells) return sv.boldCells
    const b = makeEmpty2D(INIT_ROWS, INIT_COLS, false)
    for (const r of [0,1,11,12,17,26,27]) for (let c = 0; c < INIT_COLS; c++) b[r][c] = true
    return b
  })
  const [merges, setMerges] = useState<Merge[]>(() => sv?.merges ?? [])

  const [selectionStart, setSelectionStart] = useState<{r:number;c:number}|null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{r:number;c:number}|null>(null)
  const [activeCell, setActiveCell] = useState<{r:number;c:number}|null>(null)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [loadInfo, setLoadInfo] = useState(sv ? `Cache: ${(JSON.stringify(sv).length/1024).toFixed(0)}KB (${sv.numRows}f x ${sv.numCols}c)` : 'Cargando...')

  const stateRef = useRef<SheetState>({ numRows, numCols, cells, colWidths, rowHeights, bgColors, textAligns, merges, fontFamilies, fontSizes, fontColors, borders, boldCells })
  stateRef.current = { numRows, numCols, cells, colWidths, rowHeights, bgColors, textAligns, merges, fontFamilies, fontSizes, fontColors, borders, boldCells }

  useEffect(() => { setLoaded(true) }, [])

  // === CARGAR DESDE BD (fuente principal) al montar ===
  useEffect(() => {
    if (!loaded) return
    loadFromDb(plan).then(dbState => {
      if (dbState) {
        // La BD tiene datos → usar esos como fuente de verdad
        setNumRows(dbState.numRows); setNumCols(dbState.numCols)
        setCells(dbState.cells); setColWidths(dbState.colWidths)
        setRowHeights(dbState.rowHeights); setBgColors(dbState.bgColors)
        setTextAligns(dbState.textAligns); setMerges(dbState.merges)
        setFontFamilies(dbState.fontFamilies); setFontSizes(dbState.fontSizes)
        setFontColors(dbState.fontColors); setBorders(dbState.borders)
        setBoldCells(dbState.boldCells)
        // Sincronizar caché localStorage con la BD
        localStorage.setItem(STORAGE_KEY(plan), JSON.stringify(dbState))
        setLoadInfo(`BD: ${(JSON.stringify(dbState).length/1024).toFixed(0)}KB (${dbState.numRows}f x ${dbState.numCols}c)`)
      } else if (sv) {
        // No hay datos en BD pero sí en localStorage → subirlos a la BD
        saveToDb(plan, sv).then(() => {
          setLoadInfo(`Cache→BD: ${(JSON.stringify(sv).length/1024).toFixed(0)}KB (${sv.numRows}f x ${sv.numCols}c)`)
        })
      } else {
        setLoadInfo('Plantilla por defecto')
      }
      setDbLoaded(true)
    })
  }, [loaded, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  // Asegurar merges de botones de comando tras cargar BD
  useEffect(() => {
    if (!dbLoaded) return
    for (const btn of CMD_BUTTONS) {
      if (!btn.mergeSpan) continue
      const ms = btn.mergeSpan
      const exists = merges.some(m => m.sr === btn.sr && m.sc === btn.sc && m.er === ms.er && m.ec === ms.ec)
      if (!exists) {
        setMerges(prev => {
          const nm: Merge = { sr: btn.sr, sc: btn.sc, er: ms.er, ec: ms.ec }
          const filtered = prev.filter(m => {
            const overlap = !(m.er < nm.sr || m.sr > nm.er || m.ec < nm.sc || m.sc > nm.ec)
            return !overlap
          })
          return [...filtered, nm]
        })
        setCells(prev => { const copy = prev.map(r => [...r]); if (copy[btn.sr]) copy[btn.sr][btn.sc] = btn.label; return copy })
      }
    }
    // Forzar merge del botón switch AJ6:AL7 (row 5, col 35-37)
    const switchMerge: Merge = { sr: 5, sc: 35, er: 6, ec: 37 }
    const switchExists = merges.some(m => m.sr === 5 && m.sc === 35 && m.er === 6 && m.ec === 37)
    if (!switchExists) {
      setMerges(prev => {
        const filtered = prev.filter(m => {
          const overlap = !(m.er < switchMerge.sr || m.sr > switchMerge.er || m.ec < switchMerge.sc || m.sc > switchMerge.ec)
          return !overlap
        })
        return [...filtered, switchMerge]
      })
    }
    // Limpiar merge dañado del botón IMPRIMIR que se guardó incorrectamente
    const hasBadMerge = merges.some(m => m.sr === 6 && m.sc === 30 && m.er === 7 && m.ec === 33)
    if (hasBadMerge) {
      setMerges(prev => prev.filter(m => !(m.sr === 6 && m.sc === 30 && m.er === 7 && m.ec === 33)))
      setCells(prev => { const copy = prev.map(r => [...r]); if (copy[6]) copy[6][30] = ''; return copy })
    }
    // Forzar merge del botón imprimir AE6:AH7 (row 5, col 30-33)
    const printMerge: Merge = { sr: 5, sc: 30, er: 6, ec: 33 }
    const printExists = merges.some(m => m.sr === 5 && m.sc === 30 && m.er === 6 && m.ec === 33)
    if (!printExists) {
      setMerges(prev => {
        const filtered = prev.filter(m => {
          const overlap = !(m.er < printMerge.sr || m.sr > printMerge.er || m.ec < printMerge.sc || m.sc > printMerge.ec)
          return !overlap
        })
        return [...filtered, printMerge]
      })
      setCells(prev => { const copy = prev.map(r => [...r]); if (copy[5]) copy[5][30] = 'IMPRIMIR'; return copy })
    }
  }, [dbLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar snapshot del estado inicial (después de cargar BD)
  useEffect(() => {
    if (!dbLoaded || initialCellsRef.current) return
    initialCellsRef.current = cells.map(r => [...r])
  }, [dbLoaded, cells]) // eslint-disable-line react-hooks/exhaustive-deps

  // Función de save: guarda en localStorage (rápido) y en BD (permanente)
  const saveCountRef = useRef(0)
  const doSave = useCallback((p: string) => {
    try {
      const json = JSON.stringify(stateRef.current)
      localStorage.setItem(STORAGE_KEY(p), json)
      saveCountRef.current++
      setSaveStatus(`Save#${saveCountRef.current} ${(json.length/1024).toFixed(0)}KB`)
      return true
    } catch (e) {
      console.error('[SAVE ERROR]', e)
      setSaveStatus('ERROR SAVE')
      return false
    }
  }, [])

  // === AUTO-SAVE (localStorage inmediato + BD con debounce) ===
  useEffect(() => {
    if (!loaded || !dbLoaded) return
    // Guardar en localStorage inmediatamente (caché rápido)
    const timer = setTimeout(() => {
      doSave(plan)
      setTimeout(() => setSaveStatus(''), 2000)
    }, 300)
    return () => clearTimeout(timer)
  }, [loaded, dbLoaded, plan, cells, bgColors, borders, boldCells, colWidths, rowHeights, textAligns, fontFamilies, fontSizes, fontColors, merges, numRows, numCols, doSave])

  // === GUARDAR EN BD con debounce de 3 segundos (no en cada cambio) ===
  useEffect(() => {
    if (!loaded || !dbLoaded) return
    const timer = setTimeout(() => {
      saveToDb(plan, stateRef.current)
    }, 3000)
    return () => clearTimeout(timer)
  }, [loaded, dbLoaded, plan, cells, bgColors, borders, boldCells, colWidths, rowHeights, textAligns, fontFamilies, fontSizes, fontColors, merges, numRows, numCols])

  // === SAVE ON BEFORE UNLOAD (guarda en ambos) ===
  useEffect(() => {
    if (!loaded || !dbLoaded) return
    const handler = () => {
      try {
        const json = JSON.stringify(stateRef.current)
        localStorage.setItem(STORAGE_KEY(plan), json)
        // Enviar a BD con sendBeacon (no bloquea el cierre)
        navigator.sendBeacon(`/api/dashboard-state?plan=${plan}`, JSON.stringify({ datos: stateRef.current }))
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [loaded, dbLoaded, plan])

  // === RESTORE (restaurar plantilla original y limpiar BD + localStorage) ===
  const handleRestore = () => {
    if (!confirm('Restaurar todo al diseño original? Se perderan todos los cambios.')) return
    localStorage.removeItem(STORAGE_KEY(plan))
    // Limpiar de la BD también
    fetch(`/api/dashboard-state?plan=${plan}`, { method: 'DELETE' }).catch(() => {})
    setCells(makeInitialCells()); setColWidths(makeInitialWidths())
    setRowHeights(makeInitialHeights(INIT_ROWS)); setBgColors(makeInitialBg(INIT_ROWS, INIT_COLS))
    setTextAligns(makeInitialAlign(INIT_ROWS, INIT_COLS)); setMerges([])
    setNumRows(INIT_ROWS); setNumCols(INIT_COLS)
    setFontFamilies(makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
    setFontSizes(makeInitialFontSizes(INIT_ROWS, INIT_COLS))
    setFontColors(makeInitialFontColors(INIT_ROWS, INIT_COLS))
    setBorders(makeInitialBorders(INIT_ROWS, INIT_COLS))
    setBoldCells(makeEmpty2D(INIT_ROWS, INIT_COLS, false))
    setSaveStatus('Restaurado')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const isHidden = useCallback((r: number, c: number): boolean => {
    for (const m of merges) {
      if (r >= m.sr && r <= m.er && c >= m.sc && c <= m.ec) {
        if (r === m.sr && c === m.sc) return false
        return true
      }
    }
    return false
  }, [merges])

  const getMerge = useCallback((r: number, c: number): Merge | null => {
    for (const m of merges) { if (r === m.sr && c === m.sc) return m }
    return null
  }, [merges])

  const updateCell = useCallback((r: number, c: number, val: string) => {
    setCells(prev => { const copy = prev.map(row => [...row]); if (copy[r]) copy[r][c] = val; return copy })
  }, [])

  const updateBg = useCallback((r: number, c: number, color: string) => {
    setBgColors(prev => { const copy = prev.map(row => [...row]); if (copy[r]) copy[r][c] = color; return copy })
  }, [])

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?plan=${plan}`)
      const data = await res.json()
      setTotalRecords(data.totalStudents || 0)
      updateCell(4, 25, `${data.totalStudents} Registros en la Base de Datos.`)
      const today = new Date()
      const ds = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`
      updateCell(2, 7, ds)

    } catch {}
  }, [plan, updateCell])
  useEffect(() => { loadCount() }, [loadCount])

  const colLetter = (i: number) => {
    let s = ''; let n = i
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
    return s
  }

  const [selectedCell, setSelectedCell] = useState<{r:number;c:number}|null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const handleCellClick = (r: number, c: number, shiftKey: boolean) => {
    if (shiftKey && selectionStart) { setSelectionEnd({ r, c }) }
    else { setSelectionStart({ r, c }); setSelectionEnd({ r, c }); setSelectedCell({ r, c }) }
  }

  const handleRowHeaderClick = (r: number, shiftKey: boolean) => {
    if (shiftKey && selectionStart) { setSelectionEnd({ r, c: numCols - 1 }) }
    else { setSelectionStart({ r, c: 0 }); setSelectionEnd({ r, c: numCols - 1 }); setSelectedCell({ r, c: 0 }) }
  }

  const handleColHeaderClick = (c: number, shiftKey: boolean) => {
    if (shiftKey && selectionStart) { setSelectionEnd({ r: numRows - 1, c }) }
    else { setSelectionStart({ r: 0, c }); setSelectionEnd({ r: numRows - 1, c }); setSelectedCell({ r: 0, c }) }
  }

  const focusInput = (r: number, c: number) => {
    const td = tableRef.current?.querySelector(`[data-r="${r}"][data-c="${c}"]`)
    if (td) { const input = td.querySelector('input') as HTMLInputElement; if (input) input.focus() }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return
    const { r, c } = selectedCell
    let nr = r, nc = c
    if (e.key === 'ArrowDown') { e.preventDefault(); nr = Math.min(r+1, numRows-1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nr = Math.max(r-1, 0) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nc = Math.min(c+1, numCols-1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); nc = Math.max(c-1, 0) }
    else if (e.key === 'Tab') { e.preventDefault(); nc = e.shiftKey ? Math.max(c-1,0) : Math.min(c+1, numCols-1) }
    else if (e.key === 'Enter') { e.preventDefault(); nr = Math.min(r+1, numRows-1); nc = c }
    else return
    let tries = 0
    while (isHidden(nr, nc) && tries < 500) {
      if (nr > r) nr++; else if (nr < r) nr--; else if (nc > c) nc++; else nc--
      nr = Math.max(0, Math.min(nr, numRows-1)); nc = Math.max(0, Math.min(nc, numCols-1)); tries++
    }
    setSelectedCell({ r: nr, c: nc }); setSelectionStart({ r: nr, c: nc }); setSelectionEnd({ r: nr, c: nc })
    setTimeout(() => focusInput(nr, nc), 0)
  }

  const selMinR = selectionStart && selectionEnd ? Math.min(selectionStart.r, selectionEnd.r) : -1
  const selMaxR = selectionStart && selectionEnd ? Math.max(selectionStart.r, selectionEnd.r) : -1
  const selMinC = selectionStart && selectionEnd ? Math.min(selectionStart.c, selectionEnd.c) : -1
  const selMaxC = selectionStart && selectionEnd ? Math.max(selectionStart.c, selectionEnd.c) : -1
  const isInSelection = (r: number, c: number) => { if (selMinR < 0) return false; return r >= selMinR && r <= selMaxR && c >= selMinC && c <= selMaxC }
  const hasSelection = selMinR >= 0 && (selMinR !== selMaxR || selMinC !== selMaxC)

  // === APPLY TO SELECTION HELPERS ===
  const applyToSelection = (arr: any[][], val: any, setter: (v: any[][]) => void) => {
    if (selMinR < 0) return
    setter(arr.map((row, ri) => row.map((cell, ci) =>
      ri >= selMinR && ri <= selMaxR && ci >= selMinC && ci <= selMaxC ? val : cell
    )))
  }

  // === MERGE ===
  const handleMerge = () => {
    if (!hasSelection) return
    const newMerge: Merge = { sr: selMinR, sc: selMinC, er: selMaxR, ec: selMaxC }
    const filtered = merges.filter(m => { const overlap = !(m.er < newMerge.sr || m.sr > newMerge.er || m.ec < newMerge.sc || m.sc > newMerge.ec); return !overlap })
    setMerges([...filtered, newMerge]); setSelectionStart(null); setSelectionEnd(null)
  }
  const handleUnmerge = () => { if (!selectedCell) return; setMerges(prev => prev.filter(m => !(m.sr === selectedCell.r && m.sc === selectedCell.c))) }

  // === ALIGNMENT ===
  const handleSetAlign = (align: Align) => { if (selMinR < 0) return; applyToSelection(textAligns, align, setTextAligns) }

  // === BG COLOR ===
  const handleApplyBgToSelection = (color: string) => { if (selMinR < 0) return; applyToSelection(bgColors, color, setBgColors) }

  // === FONT FAMILY ===
  const handleSetFont = (font: string) => { if (selMinR < 0) return; applyToSelection(fontFamilies, font, setFontFamilies) }

  // === FONT SIZE ===
  const handleSetFontSize = (size: number) => { if (selMinR < 0) return; applyToSelection(fontSizes, size, setFontSizes) }

  // === FONT COLOR ===
  const handleSetFontColor = (color: string) => { if (selMinR < 0) return; applyToSelection(fontColors, color, setFontColors) }

  // === BORDERS TOGGLE ===
  const handleToggleBorders = (val: boolean) => { if (selMinR < 0) return; applyToSelection(borders, val, setBorders) }

  // === BOLD TOGGLE ===
  const handleToggleBold = () => {
    if (!selectedCell) return
    const current = boldCells[selectedCell.r]?.[selectedCell.c] ?? false
    applyToSelection(boldCells, !current, setBoldCells)
  }

  // === INSERT ROW ===
  const handleInsertRow = (after: boolean) => {
    if (!selectedCell) return
    const at = after ? selectedCell.r + 1 : selectedCell.r
    const splicer = <T,>(arr: T[][], fill: T) => arr.map(row => [...row]).splice(at, 0, new Array(numCols).fill(fill)) && arr.map((row, i) => i === at ? new Array(numCols).fill(fill) : [...row])
    setCells(prev => { const c = prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill('')); return c })
    setRowHeights(prev => { const c=[...prev]; c.splice(at,0,20); return c })
    setBgColors(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill('#ffffff')); return c })
    setTextAligns(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill('left')); return c })
    setFontFamilies(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill('Arial')); return c })
    setFontSizes(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill(9)); return c })
    setFontColors(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill('#333333')); return c })
    setBorders(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill(false)); return c })
    setBoldCells(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill(false)); return c })
    setMerges(prev => prev.map(m => { if (m.sr >= at) return { ...m, sr: m.sr + 1, er: m.er + 1 }; if (m.er >= at) return { ...m, er: m.er + 1 }; return m }))
    setNumRows(numRows + 1)
  }

  // === INSERT COLUMN ===
  const handleInsertCol = (after: boolean) => {
    if (!selectedCell) return
    const at = after ? selectedCell.c + 1 : selectedCell.c
    const ins = <T,>(arr: T[][], fill: T) => arr.map(row => { const r=[...row]; r.splice(at,0,fill); return r })
    setCells(ins(cells, '')); setColWidths(p => { const r=[...p]; r.splice(at,0,80); return r })
    setBgColors(ins(bgColors, '#ffffff')); setTextAligns(ins(textAligns, 'left') as any)
    setFontFamilies(ins(fontFamilies, 'Arial')); setFontSizes(ins(fontSizes, 9))
    setFontColors(ins(fontColors, '#333333')); setBorders(ins(borders, false))
    setBoldCells(ins(boldCells, false))
    setMerges(prev => prev.map(m => { if (m.sc >= at) return { ...m, sc: m.sc + 1, ec: m.ec + 1 }; if (m.ec >= at) return { ...m, ec: m.ec + 1 }; return m }))
    setNumCols(numCols + 1)
  }

  // === DELETE ROW ===
  const handleDeleteRow = () => {
    if (!selectedCell || numRows <= 1) return
    const at = selectedCell.r
    const del = <T,>(arr: T[][]) => arr.map(r=>[...r]).filter((_,i)=>i!==at)
    setCells(del(cells)); setRowHeights(p=>p.filter((_,i)=>i!==at))
    setBgColors(del(bgColors)); setTextAligns(del(textAligns) as any)
    setFontFamilies(del(fontFamilies)); setFontSizes(del(fontSizes))
    setFontColors(del(fontColors)); setBorders(del(borders)); setBoldCells(del(boldCells))
    setMerges(prev => prev.filter(m => !(m.sr <= at && m.er >= at)).map(m => { if (m.sr > at) return { ...m, sr: m.sr - 1, er: m.er - 1 }; if (m.er > at) return { ...m, er: m.er - 1 }; return m }))
    setNumRows(numRows - 1); setSelectionStart(null); setSelectionEnd(null); setSelectedCell(null)
  }

  // === DELETE COLUMN ===
  const handleDeleteCol = () => {
    if (!selectedCell || numCols <= 1) return
    const at = selectedCell.c
    const delC = <T,>(arr: T[][]) => arr.map(row => row.filter((_,i)=>i!==at))
    setCells(delC(cells)); setColWidths(p=>p.filter((_,i)=>i!==at))
    setBgColors(delC(bgColors)); setTextAligns(delC(textAligns) as any)
    setFontFamilies(delC(fontFamilies)); setFontSizes(delC(fontSizes))
    setFontColors(delC(fontColors)); setBorders(delC(borders)); setBoldCells(delC(boldCells))
    setMerges(prev => prev.filter(m => !(m.sc <= at && m.ec >= at)).map(m => { if (m.sc > at) return { ...m, sc: m.sc - 1, ec: m.ec - 1 }; if (m.ec > at) return { ...m, ec: m.ec - 1 }; return m }))
    setNumCols(numCols - 1); setSelectionStart(null); setSelectionEnd(null); setSelectedCell(null)
  }

  // === MOVE ROW ===
  const handleMoveRow = (dir: 'up' | 'down') => {
    if (!selectedCell) return
    const fromR = selMinR >= 0 ? selMinR : selectedCell.r
    const toR = selMaxR >= 0 ? selMaxR : selectedCell.r
    const count = toR - fromR + 1
    if (dir === 'up' && fromR === 0) return
    if (dir === 'down' && toR >= numRows - 1) return
    const swapWith = dir === 'up' ? fromR - 1 : toR + 1
    const swapRows = <T,>(arr: T[]) => { const c=[...arr]; const block=c.splice(fromR,count); const nb=c.splice(swapWith,1); if(dir==='up'){c.splice(swapWith,0,...block);c.splice(swapWith+count,0,...nb)}else{c.splice(fromR,0,...nb);c.splice(fromR+1,0,...block)} return c }
    setCells(swapRows(cells)); setRowHeights(swapRows(rowHeights))
    setBgColors(swapRows(bgColors)); setTextAligns(swapRows(textAligns) as any)
    setFontFamilies(swapRows(fontFamilies)); setFontSizes(swapRows(fontSizes))
    setFontColors(swapRows(fontColors)); setBorders(swapRows(borders)); setBoldCells(swapRows(boldCells))
    setMerges(prev => prev.map(m => { let {sr,er,sc,ec}=m; if(sr>=fromR&&er<=toR){sr+=(dir==='up'?-1:1);er+=(dir==='up'?-1:1)}else if(sr===swapWith){sr=dir==='up'?toR:fromR;er=sr} return {sr,er,sc,ec} }))
    const off = dir === 'up' ? -1 : 1
    setSelectionStart({ r: fromR + off, c: selMinC >= 0 ? selMinC : 0 })
    setSelectionEnd({ r: toR + off, c: selMaxC >= 0 ? selMaxC : numCols - 1 })
    setSelectedCell({ r: fromR + off, c: selectedCell.c })
  }

  // === MOVE COLUMN ===
  const handleMoveCol = (dir: 'left' | 'right') => {
    if (!selectedCell) return
    const fromC = selMinC >= 0 ? selMinC : selectedCell.c
    const toC = selMaxC >= 0 ? selMaxC : selectedCell.c
    const count = toC - fromC + 1
    if (dir === 'left' && fromC === 0) return
    if (dir === 'right' && toC >= numCols - 1) return
    const swapWith = dir === 'left' ? fromC - 1 : toC + 1
    const swapCols = <T,>(arr: T[]) => { const r=[...arr]; const block=r.splice(fromC,count); const nb=r.splice(swapWith,1); if(dir==='left'){r.splice(swapWith,0,...block);r.splice(swapWith+count,0,...nb)}else{r.splice(fromC,0,...nb);r.splice(fromC+1,0,...block)} return r }
    setCells(cells.map(swapCols)); setColWidths(swapCols(colWidths))
    setBgColors(bgColors.map(swapCols)); setTextAligns(textAligns.map(swapCols) as any)
    setFontFamilies(fontFamilies.map(swapCols)); setFontSizes(fontSizes.map(swapCols))
    setFontColors(fontColors.map(swapCols)); setBorders(borders.map(swapCols)); setBoldCells(boldCells.map(swapCols))
    setMerges(prev => prev.map(m => { let {sr,er,sc,ec}=m; if(sc>=fromC&&ec<=toC){sc+=(dir==='left'?-1:1);ec+=(dir==='left'?-1:1)}else if(sc===swapWith){sc=dir==='left'?toC:fromC;ec=sc} return {sr,er,sc,ec} }))
    const off = dir === 'left' ? -1 : 1
    setSelectionStart({ r: selMinR >= 0 ? selMinR : 0, c: fromC + off })
    setSelectionEnd({ r: selMaxR >= 0 ? selMaxR : numRows - 1, c: toC + off })
    setSelectedCell({ r: selectedCell.r, c: fromC + off })
  }

  const handleInputBlur = (r: number, c: number, value: string) => { updateCell(r, c, value); setActiveCell(null) }
  const navigateTo = (r: number, c: number) => {
    let nr = r, nc = c, tries = 0
    while (isHidden(nr, nc) && tries < 500) { if(nr>r)nr++;else if(nr<r)nr--;else if(nc>c)nc++;else nc--; nr=Math.max(0,Math.min(nr,numRows-1));nc=Math.max(0,Math.min(nc,numCols-1));tries++ }
    setSelectedCell({r:nr,c:nc}); setSelectionStart({r:nr,c:nc}); setSelectionEnd({r:nr,c:nc}); setTimeout(()=>focusInput(nr,nc),0)
  }
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();updateCell(r,c,e.currentTarget.value);navigateTo(r+1,c)}
    else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();updateCell(r,c,e.currentTarget.value);navigateTo(r,e.shiftKey?c-1:c+1)}
    else if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)){updateCell(r,c,e.currentTarget.value)}
  }

  const isFullRowSelected = hasSelection && selMinC === 0 && selMaxC === numCols - 1
  const isFullColSelected = hasSelection && selMinR === 0 && selMaxR === numRows - 1

  const SWITCH_ROW = 5, SWITCH_COL = 35 // celda AJ6
  const PRINT_ROW = 5, PRINT_COL = 30 // celda AE6
  const switchBtnLabel = plan === 'vigente' ? 'Plan\nDerogado' : 'Plan\nVigente'

  // Estado para botones con activación condicional
  const [editMode, setEditMode] = useState(false)
  const [btnHover, setBtnHover] = useState<string | null>(null)
  const [btnDown, setBtnDown] = useState<string | null>(null)

  // === ESTADO DE BÚSQUEDA Y EDICIÓN ===
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{id:string;cedula:string;apellidos:string;nombres:string}>>([])
  const [searching, setSearching] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const initialCellsRef = useRef<string[][] | null>(null)
  const initialRawDataRef = useRef<string | null>(null)

  // Botones de comando
  const CMD_BUTTONS: CmdButton[] = [
    { sr: 7, sc: 25, label: 'Buscar / Editar Alumno', color: '#FF00FF', bgColor: '#ffffff', fontSize: 16,
      hoverColor1: '#fdf0ff', hoverColor2: '#f5ccff', hoverShadowColor: 'rgba(255,0,255,0.25)', downShadowColor: 'rgba(255,0,255,0.15)' },
    { sr: 9, sc: 25, label: 'Guardar Editado', color: '#90EE90', bgColor: '#ffffff', fontSize: 16,
      disabledColor: '#999999', activeColor: '#32CD32', requiresEdit: true,
      hoverColor1: '#f0fff0', hoverColor2: '#c8f7c8', hoverShadowColor: 'rgba(50,205,50,0.25)', downShadowColor: 'rgba(50,205,50,0.15)' },
    { sr: 7, sc: 30, label: 'Guardar Datos', color: '#5BA8FF', bgColor: '#ffffff', fontSize: 16,
      disabledColor: '#999999', activeColor: '#5BA8FF', disableOnEdit: true,
      hoverColor1: '#e8f4ff', hoverColor2: '#c0deff', hoverShadowColor: 'rgba(91,168,255,0.3)', downShadowColor: 'rgba(91,168,255,0.15)' },
    { sr: 9, sc: 30, label: 'Eliminar Datos', color: '#FF4444', bgColor: '#ffffff', fontSize: 16,
      disabledColor: '#999999', activeColor: '#FF4444', disableOnEdit: true,
      hoverColor1: '#fff0f0', hoverColor2: '#ffcccc', hoverShadowColor: 'rgba(255,68,68,0.3)', downShadowColor: 'rgba(255,68,68,0.15)' },
    { sr: 7, sc: 27, label: 'Exportar\nDatos', color: '#FF8C00', bgColor: '#ffffff', fontSize: 12,
      hoverColor1: '#fff5e6', hoverColor2: '#ffe0b3', hoverShadowColor: 'rgba(255,140,0,0.3)', downShadowColor: 'rgba(255,140,0,0.15)',
      mergeSpan: { er: 10, ec: 29 } },
  ]

  // Busca botón de comando por posición exacta o por texto en celdas combinadas
  const isCmdBtn = (r: number, c: number, cellText?: string) => {
    const posBtn = CMD_BUTTONS.find(b => b.sr === r && b.sc === c)
    if (posBtn) return posBtn
    if (cellText) {
      const textBtn = CMD_BUTTONS.find(b => cellText.trim() === b.label)
      if (textBtn) return textBtn
    }
    return null
  }

  // === FUNCIÓN DE CELDA: convierte 'M5' → {r:4, c:12} ===
  const cellRef = (ref: string): {r:number;c:number} | null => {
    const match = ref.trim().match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    let col = 0
    for (let i = 0; i < match[1].length; i++) col = col * 26 + (match[1].charCodeAt(i) - 64)
    return { r: parseInt(match[2]) - 1, c: col - 1 }
  }

  // === MAPEO CAMPO_BD → CELDA DASHBOARD ===
  const FIELD_MAP: [string, string][] = [
    ['CEDULA','M5'],['FECHA','M6'],['APELLIDOS','M7'],['NOMBRES','M8'],
    ['PAIS','M9'],['ESTADO','M10'],['MUNICIPIO','M11'],
    ['INST.1','G15'],['LOCAL.1','I15'],['EF.1','L15'],
    ['INST.2','G16'],['LOCAL.2','I16'],['EF.2','L16'],
    ['INST.3','G17'],['LOCAL.3','I17'],['EF.3','L17'],
    ['INST.4','G18'],['LOCAL.4','I18'],['EF.4','L18'],
    ['INST.5','G19'],['LOCAL.5','I19'],['EF.5','L19'],
    ['NOTA.CA.1','T15'],['EVAL.CA.1','U15'],['MES.CA.1','V15'],['AÑO.CA.1','W15'],['INST.CA.1','X15'],
    ['NOTA.IN.1','T16'],['EVAL.IN.1','U16'],['MES.IN.1','V16'],['AÑO.IN.1','W16'],['INST.IN.1','X16'],
    ['NOTA.MA.1','T17'],['EVAL.MA.1','U17'],['MES.MA.1','V17'],['AÑO.MA.1','W17'],['INST.MA.1','X17'],
    ['NOTA.EF.1','T18'],['EVAL.EF.1','U18'],['MES.EF.1','V18'],['AÑO.EF.1','W18'],['INST.EF.1','X18'],
    ['NOTA.AP.1','T19'],['EVAL.AP.1','U19'],['MES.AP.1','V19'],['AÑO.AP.1','W19'],['INST.AP.1','X19'],
    ['NOTA.CN.1','T20'],['EVAL.CN.1','U20'],['MES.CN.1','V20'],['AÑO.CN.1','W20'],['INST.CN.1','X20'],
    ['NOTA.GH.1','T21'],['EVAL.GH.1','U21'],['MES.GH.1','V21'],['AÑO.GH.1','W21'],['INST.GH.1','X21'],
    ['NOTA.CA.2','AA15'],['EVAL.CA.2','AB15'],['MES.CA.2','AC15'],['AÑO.CA.2','AD15'],['INST.CA.2','AE15'],
    ['NOTA.IN.2','AA16'],['EVAL.IN.2','AB16'],['MES.IN.2','AC16'],['AÑO.IN.2','AD16'],['INST.IN.2','AE16'],
    ['NOTA.MA.2','AA17'],['EVAL.MA.2','AB17'],['MES.MA.2','AC17'],['AÑO.MA.2','AD17'],['INST.MA.2','AE17'],
    ['NOTA.EF.2','AA18'],['EVAL.EF.2','AB18'],['MES.EF.2','AC18'],['AÑO.EF.2','AD18'],['INST.EF.2','AE18'],
    ['NOTA.AP.2','AA19'],['EVAL.AP.2','AB19'],['MES.AP.2','AC19'],['AÑO.AP.2','AD19'],['INST.AP.2','AE19'],
    ['NOTA.CN.2','AA20'],['EVAL.CN.2','AB20'],['MES.CN.2','AC20'],['AÑO.CN.2','AD20'],['INST.CN.2','AE20'],
    ['NOTA.GH.2','AA21'],['EVAL.GH.2','AB21'],['MES.GH.2','AC21'],['AÑO.GH.2','AD21'],['INST.GH.2','AE21'],
    ['NOTA.CA.3','H25'],['EVAL.CA.3','I25'],['MES.CA.3','J25'],['AÑO.CA.3','K25'],['INST.CA.3','L25'],
    ['NOTA.IN.3','H26'],['EVAL.IN.3','I26'],['MES.IN.3','J26'],['AÑO.IN.3','K26'],['INST.IN.3','L26'],
    ['NOTA.MA.3','H27'],['EVAL.MA.3','I27'],['MES.MA.3','J27'],['AÑO.MA.3','K27'],['INST.MA.3','L27'],
    ['NOTA.EF.3','H28'],['EVAL.EF.3','I28'],['MES.EF.3','J28'],['AÑO.EF.3','K28'],['INST.EF.3','L28'],
    ['NOTA.FI.3','H29'],['EVAL.FI.3','I29'],['MES.FI.3','J29'],['AÑO.FI.3','K29'],['INST.FI.3','L29'],
    ['NOTA.QU.3','H30'],['EVAL.QU.3','I30'],['MES.QU.3','J30'],['AÑO.QU.3','K30'],['INST.QU.3','L30'],
    ['NOTA.BI.3','H31'],['EVAL.BI.3','I31'],['MES.BI.3','J31'],['AÑO.BI.3','K31'],['INST.BI.3','L31'],
    ['NOTA.GH.3','H32'],['EVAL.GH.3','I32'],['MES.GH.3','J32'],['AÑO.GH.3','K32'],['INST.GH.3','L32'],
    ['NOTA.FS.3','H33'],['EVAL.FS.3','I33'],['MES.FS.3','J33'],['AÑO.FS.3','K33'],['INST.FS.3','L33'],
    ['NOTA.CA.4','T25'],['EVAL.CA.4','U25'],['MES.CA.4','V25'],['AÑO.CA.4','W25'],['INST.CA.4','X25'],
    ['NOTA.IN.4','T26'],['EVAL.IN.4','U26'],['MES.IN.4','V26'],['AÑO.IN.4','W26'],['INST.IN.4','X26'],
    ['NOTA.MA.4','T27'],['EVAL.MA.4','U27'],['MES.MA.4','V27'],['AÑO.MA.4','W27'],['INST.MA.4','X27'],
    ['NOTA.EF.4','T28'],['EVAL.EF.4','U28'],['MES.EF.4','V28'],['AÑO.EF.4','W28'],['INST.EF.4','X28'],
    ['NOTA.FI.4','T29'],['EVAL.FI.4','U29'],['MES.FI.4','V29'],['AÑO.FI.4','W29'],['INST.FI.4','X29'],
    ['NOTA.QU.4','T30'],['EVAL.QU.4','U30'],['MES.QU.4','V30'],['AÑO.QU.4','W30'],['INST.QU.4','X30'],
    ['NOTA.BI.4','T31'],['EVAL.BI.4','U31'],['MES.BI.4','V31'],['AÑO.BI.4','W31'],['INST.BI.4','X31'],
    ['NOTA.GH.4','T32'],['EVAL.GH.4','U32'],['MES.GH.4','V32'],['AÑO.GH.4','W32'],['INST.GH.4','X32'],
    ['NOTA.FS.4','T33'],['EVAL.FS.4','U33'],['MES.FS.4','V33'],['AÑO.FS.4','W33'],['INST.FS.4','X33'],
    ['NOTA.CA.5','AA25'],['EVAL.CA.5','AB25'],['MES.CA.5','AC25'],['AÑO.CA.5','AD25'],['INST.CA.5','AE25'],
    ['NOTA.IN.5','AA26'],['EVAL.IN.5','AB26'],['MES.IN.5','AC26'],['AÑO.IN.5','AD26'],['INST.IN.5','AE26'],
    ['NOTA.MA.5','AA27'],['EVAL.MA.5','AB27'],['MES.MA.5','AC27'],['AÑO.MA.5','AD27'],['INST.MA.5','AE27'],
    ['NOTA.EF.5','AA28'],['EVAL.EF.5','AB28'],['MES.EF.5','AC28'],['AÑO.EF.5','AD28'],['INST.EF.5','AE28'],
    ['NOTA.FI.5','AA29'],['EVAL.FI.5','AB29'],['MES.FI.5','AC29'],['AÑO.FI.5','AD29'],['INST.FI.5','AE29'],
    ['NOTA.QU.5','AA30'],['EVAL.QU.5','AB30'],['MES.QU.5','AC30'],['AÑO.QU.5','AD30'],['INST.QU.5','AE30'],
    ['NOTA.BI.5','AA31'],['EVAL.BI.5','AB31'],['MES.BI.5','AC31'],['AÑO.BI.5','AD31'],['INST.BI.5','AE31'],
    ['NOTA.CT.5','AA32'],['EVAL.CT.5','AB32'],['MES.CT.5','AC32'],['AÑO.CT.5','AD32'],['INST.CT.5','AE32'],
    ['NOTA.GH.5','AA33'],['EVAL.GH.5','AB33'],['MES.GH.5','AC33'],['AÑO.GH.5','AD33'],['INST.GH.5','AE33'],
    ['NOTA.FS.5','AA34'],['EVAL.FS.5','AB34'],['MES.FS.5','AC34'],['AÑO.FS.5','AD34'],['INST.FS.5','AE34'],
    ['OC.LITERAL.1','AH15'],['OC.LITERAL.2','AH16'],['OC.LITERAL.3','AH17'],['OC.LITERAL.4','AH18'],['OC.LITERAL.5','AH19'],
    ['PG.GRUPO.1','AH24'],['PG.GRUPO.2','AH25'],['PG.GRUPO.3','AH26'],['PG.GRUPO.4','AH27'],['PG.GRUPO.5','AH28'],
    ['PG.LITERAL.1','AL15'],['PG.LITERAL.2','AL16'],['PG.LITERAL.3','AL17'],['PG.LITERAL.4','AL18'],['PG.LITERAL.5','AL19'],
    ['OBS.CERT.L1','F35'],['OBS.CERT.L2','B36'],['OBS.NOTAS.L1','F39'],['OBS.NOTAS.L2','B40'],['OBS.NOTAS.L3','B41'],
    ['SECCION.1','X13'],['SECCION.2','AE13'],['SECCION.3','L23'],['SECCION.4','X23'],['SECCION.5','AE23'],
    ['TITULO.SERIAL','AJ31'],['TITULO.EXPEDICION','AJ32'],['TITULO.EGRESO','AJ33'],['CERT.EXPEDICION','AJ34'],
    ['OBS.BOLETA.L1','F43'],['OBS.BOLETA.L2','B44'],['OBS.BOLETA.L3','B45'],
    ['OBS.CERT.L3','B37'],['OBS.CERT.L4','B38'],
  ]
  const PROMEDIO_CELL = cellRef('AJ35')

  // === BUSCAR ESTUDIANTE ===
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(q.trim())}&plan=vigente&limit=10`)
      const data = await res.json()
      setSearchResults(data.students || [])
    } catch { setSearchResults([]) }
    setSearching(false)
  }, [])

  // === CARGAR DATOS DEL ESTUDIANTE AL DASHBOARD ===
  const loadStudentToDashboard = useCallback(async (studentId: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}?plan=vigente`)
      const student = await res.json()
      if (!student || student.error) { restoreInitialState(); return }

      setEditingStudentId(student.id)
      setShowSearchModal(false)
      setSearchQuery('')
      setSearchResults([])

      // Parsear rawData
      let rawData: Record<string, string> = {}
      try { rawData = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData || {}) } catch { rawData = {} }
      initialRawDataRef.current = typeof student.rawData === 'string' ? student.rawData : JSON.stringify(student.rawData || {})

      // Construir mapa campo→valor
      const vals: Record<string, string> = {}
      vals['CEDULA'] = student.cedula || ''
      vals['FECHA'] = student.fechaNacimiento || ''
      vals['APELLIDOS'] = student.apellidos || ''
      vals['NOMBRES'] = student.nombres || ''
      vals['PAIS'] = student.pais || ''
      vals['ESTADO'] = student.estado || ''
      vals['MUNICIPIO'] = student.municipio || ''

      for (const [campo] of FIELD_MAP) {
        if (vals[campo] === undefined && rawData[campo] !== undefined) {
          vals[campo] = String(rawData[campo] || '')
        }
      }

      // Aplicar valores a las celdas (usar setCells funcional para evitar stale closure)
      let notaSum = 0
      let notaCount = 0
      // Pre-calcular valores y posiciones
      const fieldPositions: Array<[string, string, {r:number;c:number}|null]> = []
      for (const [campo, celda] of FIELD_MAP) {
        const pos = cellRef(celda)
        fieldPositions.push([campo, vals[campo] || '', pos])
        if (campo.startsWith('NOTA.')) {
          const n = parseFloat(vals[campo] || '')
          if (!isNaN(n) && n >= 1 && n <= 20) { notaSum += n; notaCount++ }
        }
      }
      const promedioVal = PROMEDIO_CELL && notaCount > 0 ? (notaSum / notaCount).toFixed(2) : ''

      setCells(prev => {
        const newCells = prev.map(row => [...row])
        for (const [, val, pos] of fieldPositions) {
          if (pos && newCells[pos.r]) newCells[pos.r][pos.c] = val
        }
        if (PROMEDIO_CELL && promedioVal) {
          newCells[PROMEDIO_CELL.r][PROMEDIO_CELL.c] = promedioVal
        }
        return newCells
      })

      setEditMode(true)
    } catch (e) { console.error('[LOAD STUDENT ERROR]', e) }
  }, [restoreInitialState])

  // === RESTAURAR ESTADO INICIAL ===
  const restoreInitialState = useCallback(() => {
    if (initialCellsRef.current) {
      setCells(initialCellsRef.current.map(r => [...r]))
    }
    setEditingStudentId(null)
    initialRawDataRef.current = null
    setEditMode(false)
    setShowSearchModal(false)
  }, [])

  // === GUARDAR EDICIÓN EN BD Y RESTAURAR ===
  const saveEditedStudent = useCallback(async () => {
    if (!editingStudentId) return
    try {
      const currentCells = stateRef.current.cells
      const rawObj: Record<string, string> = {}
      for (const [campo, celda] of FIELD_MAP) {
        const pos = cellRef(celda)
        if (!pos) continue
        rawObj[campo] = currentCells[pos.r]?.[pos.c] || ''
      }
      const m5 = cellRef('M5'), m6 = cellRef('M6'), m7 = cellRef('M7'), m8 = cellRef('M8')
      const m9 = cellRef('M9'), m10 = cellRef('M10'), m11 = cellRef('M11')
      const updateData: Record<string, string> = {}
      if (m5) updateData.cedula = currentCells[m5.r]?.[m5.c] || ''
      if (m6) updateData.fechaNacimiento = currentCells[m6.r]?.[m6.c] || ''
      if (m7) updateData.apellidos = currentCells[m7.r]?.[m7.c] || ''
      if (m8) updateData.nombres = currentCells[m8.r]?.[m8.c] || ''
      if (m9) updateData.pais = currentCells[m9.r]?.[m9.c] || ''
      if (m10) updateData.estado = currentCells[m10.r]?.[m10.c] || ''
      if (m11) updateData.municipio = currentCells[m11.r]?.[m11.c] || ''
      updateData.rawData = JSON.stringify(rawObj)

      await fetch(`/api/students/${editingStudentId}?plan=vigente`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
      })
      restoreInitialState()
      setSaveStatus('DATOS GUARDADOS ✓')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) {
      console.error('[SAVE EDITED ERROR]', e)
      setSaveStatus('ERROR AL GUARDAR')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }, [editingStudentId, restoreInitialState])

  return (
    <div className="overflow-auto">
      {/* TOOLBAR ROW 1 */}
      <div className="sticky top-0 z-30 bg-gray-800 text-white text-[10px] px-3 py-1.5 flex flex-wrap items-center gap-1.5">
        <span className="font-bold text-[10px]">Plan: {plan.toUpperCase()}</span>


        {/* B */}
        <button onClick={handleToggleBold} disabled={!selectedCell}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px] font-bold border border-gray-500" title="Negrita">B</button>

        {/* Alignment */}
        <button onClick={() => handleSetAlign('left')} className="bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-[9px] border border-gray-500" title="Izquierda">
          <span className="inline-block w-3" style={{textAlign:'left'}}>▸</span>
        </button>
        <button onClick={() => handleSetAlign('center')} className="bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-[9px] border border-gray-500" title="Centrar">
          <span className="inline-block w-3" style={{textAlign:'center'}}>▸</span>
        </button>
        <button onClick={() => handleSetAlign('right')} className="bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-[9px] border border-gray-500" title="Derecha">
          <span className="inline-block w-3" style={{textAlign:'right'}}>◂</span>
        </button>

        <span className="text-gray-600">|</span>

        {/* Font */}
        <select onChange={e => handleSetFont(e.target.value)} disabled={!selectedCell}
          className="bg-gray-700 text-white text-[9px] px-1 py-0.5 rounded border border-gray-500 disabled:opacity-40"
          title="Tipo de fuente" style={{maxWidth:'110px'}}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input type="number" value={selectedCell ? (fontSizes[selectedCell.r]?.[selectedCell.c] || 9) : 9}
          onChange={e => handleSetFontSize(parseInt(e.target.value) || 9)} disabled={!selectedCell}
          className="w-10 bg-gray-700 text-white text-[9px] px-1 rounded text-center border border-gray-500 disabled:opacity-40" title="Tamaño fuente" />px

        {/* Font Color */}
        <span title="Color de texto" className="relative">
          <span className="text-[9px]">A</span>
          <input type="color" value={selectedCell ? (fontColors[selectedCell.r]?.[selectedCell.c] || '#333333') : '#333333'}
            onChange={e => handleSetFontColor(e.target.value)} disabled={!selectedCell}
            className="w-5 h-4 cursor-pointer absolute -top-0.5 left-3 opacity-60" />
        </span>

        <span className="text-gray-600">|</span>

        {/* Merge */}
        <button onClick={handleMerge} disabled={!hasSelection} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">Combinar</button>
        <button onClick={handleUnmerge} disabled={!selectedCell||!getMerge(selectedCell.r,selectedCell.c)} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">Descomb.</button>

        <span className="text-gray-600">|</span>

        {/* Insert/Delete */}
        <button onClick={()=>handleInsertRow(false)} disabled={!selectedCell} className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar fila arriba">+F</button>
        <button onClick={()=>handleInsertRow(true)} disabled={!selectedCell} className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar fila abajo">+F↓</button>
        <button onClick={()=>handleInsertCol(false)} disabled={!selectedCell} className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar columna izquierda">+C</button>
        <button onClick={()=>handleInsertCol(true)} disabled={!selectedCell} className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar columna derecha">+C→</button>
        <button onClick={handleDeleteRow} disabled={!selectedCell||numRows<=1} className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">-F</button>
        <button onClick={handleDeleteCol} disabled={!selectedCell||numCols<=1} className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">-C</button>

        <span className="text-gray-600">|</span>

        {/* Move */}
        <button onClick={()=>handleMoveRow('up')} disabled={!selectedCell||selMinR===0} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">F↑</button>
        <button onClick={()=>handleMoveRow('down')} disabled={!selectedCell||selMaxR>=numRows-1} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">F↓</button>
        <button onClick={()=>handleMoveCol('left')} disabled={!selectedCell||selMinC===0} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">C←</button>
        <button onClick={()=>handleMoveCol('right')} disabled={!selectedCell||selMaxC>=numCols-1} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">C→</button>

        <span className="text-gray-600">|</span>

        {hasSelection && <span className="text-yellow-300">{colLetter(selMinC)}{selMinR+1}:{colLetter(selMaxC)}{selMaxR+1} ({selMaxR-selMinR+1}f x {selMaxC-selMinC+1}c)</span>}

        <span className="text-cyan-300 text-[8px]">{loadInfo}</span>
        {saveStatus && <span className={saveStatus.includes('ERROR') ? 'text-red-400' : 'text-green-400'}>{saveStatus}</span>}
        <button onClick={async () => {
          try {
            const json = JSON.stringify(stateRef.current)
            localStorage.setItem(STORAGE_KEY(plan), json)
            // Guardar en BD también
            await saveToDb(plan, stateRef.current)
            saveCountRef.current++
            setSaveStatus(`GUARDADO #${saveCountRef.current} (BD+Cache) ${(json.length/1024).toFixed(0)}KB ✓`)
          } catch (e) { setSaveStatus('ERROR: ' + (e as Error).message) }
          setTimeout(() => setSaveStatus(''), 4000)
        }} className="bg-green-700 hover:bg-green-600 px-3 py-0.5 rounded text-[10px] font-bold">GUARDAR</button>
        <button onClick={handleRestore} className="bg-red-800 hover:bg-red-700 px-2 py-0.5 rounded text-[9px]">Restaurar</button>
        <span className="text-gray-400 ml-auto">{numRows}f x {numCols}c</span>
      </div>

      {/* TOOLBAR ROW 2 - Cell props */}
      {selectedCell && (
        <div className="sticky top-7 z-30 bg-gray-700 text-white text-[10px] px-3 py-1 flex flex-wrap items-center gap-2">
          <b>{colLetter(selectedCell.c)}{selectedCell.r+1}</b>
          <span className="text-gray-500">|</span>
          Ancho: <input type="number" value={colWidths[selectedCell.c]||80} onChange={e=>{const w=[...colWidths];w[selectedCell.c]=parseInt(e.target.value)||40;setColWidths(w)}} className="w-12 bg-gray-600 text-white text-[9px] px-1 rounded text-center" />px
          Alto: <input type="number" value={rowHeights[selectedCell.r]||20} onChange={e=>{const h=[...rowHeights];h[selectedCell.r]=parseInt(e.target.value)||20;setRowHeights(h)}} className="w-12 bg-gray-600 text-white text-[9px] px-1 rounded text-center" />px
          <span className="text-gray-500">|</span>
          Fondo: <input type="color" value={bgColors[selectedCell.r]?.[selectedCell.c]||'#ffffff'} onChange={e=>{updateBg(selectedCell.r,selectedCell.c,e.target.value);handleApplyBgToSelection(e.target.value)}} className="w-5 h-4 cursor-pointer" />
          <span className="text-gray-500">|</span>
          Texto: <input type="color" value={fontColors[selectedCell.r]?.[selectedCell.c]||'#333333'} onChange={e=>handleSetFontColor(e.target.value)} className="w-5 h-4 cursor-pointer" />
          <span className="text-gray-500">|</span>
          Bordes:
          <button onClick={()=>handleToggleBorders(true)} className="bg-green-800 hover:bg-green-700 px-1.5 py-0.5 rounded text-[9px]" title="Mostrar bordes">ON</button>
          <button onClick={()=>handleToggleBorders(false)} className="bg-gray-600 hover:bg-gray-500 px-1.5 py-0.5 rounded text-[9px]" title="Ocultar bordes">OFF</button>
          {hasSelection && <span className="text-[8px] text-gray-400">(a seleccion)</span>}
        </div>
      )}

      <table ref={tableRef} className="border-separate border-spacing-0" onKeyDown={handleKeyDown}
        style={{ marginTop: selectedCell ? '52px' : '28px' }}>
        <colgroup>
          <col style={{ width: '35px' }} />
          {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
        </colgroup>
        <tbody>
          <tr>
            <td className="border border-gray-400 bg-gray-300 text-[8px] text-center text-gray-600 sticky left-0 z-20"
              style={{ top: selectedCell ? '52px' : '28px' }}></td>
            {Array.from({ length: numCols }).map((_, c) => {
              const colSel = selMinC <= c && c <= selMaxC && selMinR === 0 && selMaxR === numRows - 1
              return (
                <td key={c} onClick={(e) => handleColHeaderClick(c, e.shiftKey)}
                  className={`border border-gray-400 text-[8px] text-center font-mono cursor-pointer select-none ${colSel ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                  style={{ top: selectedCell ? '52px' : '28px', position: 'sticky', zIndex: 15 }}>
                  {colLetter(c)}
                </td>
              )
            })}
          </tr>

          {Array.from({ length: numRows }).map((_, r) => (
            <tr key={r} style={{ height: `${rowHeights[r] || 20}px` }}>
              <td onClick={(e) => handleRowHeaderClick(r, e.shiftKey)}
                className={`border border-gray-400 text-[8px] text-center cursor-pointer select-none sticky left-0 z-5 ${selMinR<=r&&r<=selMaxR&&selMinC===0&&selMaxC===numCols-1?'bg-blue-400 text-white':'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                {r + 1}
              </td>
              {Array.from({ length: numCols }).map((_, c) => {
                if (isHidden(r, c)) return null
                const merge = getMerge(r, c)
                const colSpan = merge ? (merge.ec - merge.sc + 1) : 1
                const rowSpan = merge ? (merge.er - merge.sr + 1) : 1
                const selected = isInSelection(r, c)
                const cellBorder = borders[r]?.[c] !== false

                const isSwitchCell = r === SWITCH_ROW && c === SWITCH_COL
                const isPrintCell = r === PRINT_ROW && c === PRINT_COL
                const cmdBtn = isCmdBtn(r, c, cells[r]?.[c])
                const isBtnCell = isSwitchCell || isPrintCell || !!cmdBtn
                const cmdDisabled = cmdBtn ? ((cmdBtn.requiresEdit && !editMode) || (cmdBtn.disableOnEdit && editMode)) : false
                const btnKey = `${r}-${c}`
                const isHov = btnHover === btnKey
                const isDn = btnDown === btnKey
                return (
                  <td key={c} data-r={r} data-c={c}
                    onClick={(e) => { if (!isBtnCell) handleCellClick(r, c, e.shiftKey) }}
                    colSpan={colSpan > 1 ? colSpan : undefined}
                    rowSpan={rowSpan > 1 ? rowSpan : undefined}
                    className={`p-0 relative ${selected && !isBtnCell ? 'ring-2 ring-blue-400 z-10' : ''} ${cellBorder ? 'border border-gray-400' : ''}`}
                    style={{
                      backgroundColor: isSwitchCell ? '#2563eb' : (selected ? '#bbdefb' : (bgColors[r]?.[c] || '#ffffff')),
                      color: isSwitchCell ? '#fff' : (fontColors[r]?.[c] || '#333'),
                      fontWeight: boldCells[r]?.[c] ? 'bold' : 'normal',
                      fontStyle: 'normal',
                      fontSize: isSwitchCell ? '9px' : `${fontSizes[r]?.[c] || 9}px`,
                      fontFamily: fontFamilies[r]?.[c] || 'Arial',
                      textAlign: textAligns[r]?.[c] || 'left',
                      verticalAlign: 'middle',
                    }}>
                    {isSwitchCell ? (
                      <button onClick={(e) => { e.stopPropagation(); doSave(plan); onSwitchPlan() }}
                        className="w-full h-full bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold px-1 py-0.5 rounded transition cursor-pointer">
                        {switchBtnLabel}
                      </button>
                    ) : isPrintCell ? (
                      <button onClick={(e) => { e.stopPropagation(); window.print() }}
                        onMouseEnter={() => setBtnHover(btnKey)} onMouseLeave={() => { setBtnHover(null); setBtnDown(null) }}
                        onMouseDown={() => setBtnDown(btnKey)} onMouseUp={() => setBtnDown(null)}
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: '#ffffff', color: '#000000', fontSize: '12px',
                          fontFamily: 'Arial', fontWeight: 'bold', border: '1px solid #333333',
                          borderRadius: '2px', userSelect: 'none', whiteSpace: 'nowrap',
                          boxShadow: isDn ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : '1px 1px 3px rgba(0,0,0,0.3)',
                          transform: isDn ? 'translateY(1px)' : 'none',
                        }}>
                        IMPRIMIR
                      </button>
                    ) : cmdBtn ? (
                      <button
                        disabled={cmdDisabled}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (cmdBtn.label === 'Buscar / Editar Alumno') { setShowSearchModal(true) }
                          else if (cmdBtn.label === 'Guardar Editado') { saveEditedStudent() }
                        }}
                        onMouseEnter={() => setBtnHover(btnKey)} onMouseLeave={() => { setBtnHover(null); setBtnDown(null) }}
                        onMouseDown={() => setBtnDown(btnKey)} onMouseUp={() => setBtnDown(null)}
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          backgroundColor: cmdDisabled ? (cmdBtn.disabledColor || '#cccccc') : (isHov ? (cmdBtn.hoverColor1 || '#f0f0f0') : (cmdBtn.bgColor || '#ffffff')),
                          color: cmdDisabled ? (cmdBtn.disabledColor || '#999999') : cmdBtn.color,
                          fontSize: `${cmdBtn.fontSize}px`, fontFamily: 'Arial', fontWeight: 'bold',
                          textAlign: 'center', verticalAlign: 'middle', lineHeight: 'normal',
                          border: `2px solid ${cmdDisabled ? '#cccccc' : cmdBtn.color}`,
                          borderRadius: '4px',
                          boxShadow: cmdDisabled ? 'none' : (isDn
                            ? `inset 0 1px 3px ${cmdBtn.downShadowColor || 'rgba(0,0,0,0.15)'}`
                            : (isHov ? `2px 2px 6px ${cmdBtn.hoverShadowColor || 'rgba(0,0,0,0.2)'}` : '1px 1px 3px rgba(0,0,0,0.2)')),
                          transform: isDn ? 'translateY(1px)' : 'none',
                          userSelect: 'none', whiteSpace: 'pre-line',
                          opacity: cmdDisabled ? 0.6 : 1,
                          cursor: cmdDisabled ? 'not-allowed' : 'pointer',
                        }}>
                        {cmdBtn.label}
                      </button>
                    ) : (
                    <input type="text" defaultValue={cells[r]?.[c] || ''}
                      onBlur={(e) => handleInputBlur(r, c, e.target.value)}
                      onFocus={() => { setActiveCell({r,c}); setSelectedCell({r,c}); setSelectionStart({r,c}); setSelectionEnd({r,c}) }}
                      onKeyDown={(e) => handleInputKeyDown(e, r, c)}
                      className="w-full h-full bg-transparent border-0 outline-none p-0 px-0.5"
                      style={{
                        color: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit',
                        fontSize: 'inherit', fontFamily: 'inherit', textAlign: 'inherit',
                        minHeight: `${rowHeights[r] || 20}px`, lineHeight: `${rowHeights[r] || 20}px`,
                      }} />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL DE BÚSQUEDA DE ALUMNO */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" style={{ marginTop: '0' }}>
          <div className="bg-white rounded-lg shadow-2xl p-4 w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-800">Buscar / Editar Alumno</h3>
              <button onClick={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]) }}
                className="text-gray-500 hover:text-red-500 text-lg leading-none font-bold">&times;</button>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Cedula o Nombre del alumno..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value.length >= 2) doSearch(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') doSearch(searchQuery) }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus />
              {searching && <div className="text-xs text-gray-500 text-center py-2">Buscando...</div>}
              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                  {searchResults.map(s => (
                    <button key={s.id}
                      onClick={() => loadStudentToDashboard(s.id)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-gray-100 last:border-0 cursor-pointer">
                      <span className="font-bold">{s.cedula}</span> - {s.apellidos}, {s.nombres}
                    </button>
                  ))}
                </div>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-xs text-red-500 text-center py-2">No se encontraron alumnos</div>
              )}
              {searchQuery.length < 2 && (
                <div className="text-xs text-gray-400 text-center py-2">Escriba al menos 2 caracteres para buscar</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  DashboardPage – thin wrapper that manages plan state                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jo-sigae-current-plan')
      return stored === 'derogado' ? 'derogado' : 'vigente'
    }
    return 'vigente'
  })
  const handleSwitch = () => {
    const newPlan = plan === 'vigente' ? 'derogado' : 'vigente'
    setPlan(newPlan)
    localStorage.setItem('jo-sigae-current-plan', newPlan)
    window.dispatchEvent(new Event('plan-changed'))
  }
  return (
    <AppShell>
      <SheetEditor key={plan} plan={plan} onSwitchPlan={handleSwitch} />
    </AppShell>
  )
}