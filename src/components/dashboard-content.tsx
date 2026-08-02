'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import * as VT from '@/lib/templates/vigente-template'
import * as DT from '@/lib/templates/derogado-template'
import { buildDerogadoFlatMap } from '@/lib/build-derogado-flatmap'
import { FIELD_MAP_VIGENTE, FIELD_MAP_DEROGADO } from '@/lib/field-maps'
import { fmtDate } from '@/lib/flatten-raw'

type Align = 'left' | 'center' | 'right'
interface Merge { sr: number; sc: number; er: number; ec: number }
interface CmdButton {
  sr: number; sc: number; label: string; color: string; bgColor: string; fontSize: number
  disabledColor?: string; disabledBgColor?: string; activeColor?: string; requiresEdit?: boolean; disableOnEdit?: boolean; disableOnDerogado?: boolean; disableOnNewData?: boolean; requiresNewData?: boolean
  hoverColor1?: string; hoverColor2?: string; hoverShadowColor?: string; downShadowColor?: string
  mergeSpan?: { er: number; ec: number }
}

const FONTS = [
  'Arial','Verdana','Tahoma','Georgia','Times New Roman',
  'Courier New','Trebuchet MS','Lucida Console','Impact','Comic Sans MS'
]

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
  // Seleccionar plantilla según plan
  const tpl = plan === 'derogado' ? DT : VT
  const INIT_COLS = tpl.INIT_COLS
  const INIT_ROWS = tpl.INIT_ROWS

  // === FUNCIÓN DE CELDA: convierte 'M5' → {r:4, c:12} ===
  const cellRef = (ref: string): {r:number;c:number} | null => {
    const match = ref.trim().match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    let col = 0
    for (let i = 0; i < match[1].length; i++) col = col * 26 + (match[1].charCodeAt(i) - 64)
    return { r: parseInt(match[2]) - 1, c: col - 1 }
  }

  // Seleccionar el mapa según el plan activo (importado de field-maps.ts)
  const fieldMap = plan === 'derogado' ? FIELD_MAP_DEROGADO : FIELD_MAP_VIGENTE
  const PROMEDIO_CELL = plan === 'derogado' ? null : cellRef('AJ35')

  const [totalRecords, setTotalRecords] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [dbLoaded, setDbLoaded] = useState(false)

  // Caché localStorage como respaldo inmediato (carga rápida)
  const _saved = useRef(readSavedOnce(plan))
  const sv = _saved.current

  const [numRows, setNumRows] = useState(sv?.numRows ?? INIT_ROWS)
  const [numCols, setNumCols] = useState(sv?.numCols ?? INIT_COLS)
  const [cells, setCells] = useState<string[][]>(() => sv?.cells ?? tpl.makeInitialCells())
  const [colWidths, setColWidths] = useState<number[]>(() => sv?.colWidths ?? tpl.makeInitialWidths())
  const [rowHeights, setRowHeights] = useState<number[]>(() => sv?.rowHeights ?? tpl.makeInitialHeights(INIT_ROWS))
  const [bgColors, setBgColors] = useState<string[][]>(() => sv?.bgColors ?? tpl.makeInitialBg(INIT_ROWS, INIT_COLS))
  const [textAligns, setTextAligns] = useState<Align[][]>(() => sv?.textAligns ?? tpl.makeInitialAlign(INIT_ROWS, INIT_COLS))
  const [fontFamilies, setFontFamilies] = useState<string[][]>(() => sv?.fontFamilies ?? tpl.makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
  const [fontSizes, setFontSizes] = useState<number[][]>(() => sv?.fontSizes ?? tpl.makeInitialFontSizes(INIT_ROWS, INIT_COLS))
  const [fontColors, setFontColors] = useState<string[][]>(() => sv?.fontColors ?? tpl.makeInitialFontColors(INIT_ROWS, INIT_COLS))
  const [borders, setBorders] = useState<boolean[][]>(() => sv?.borders ?? tpl.makeInitialBorders(INIT_ROWS, INIT_COLS))
  const [boldCells, setBoldCells] = useState<boolean[][]>(() => sv?.boldCells ?? tpl.makeInitialBold(INIT_ROWS, INIT_COLS))
  const [merges, setMerges] = useState<Merge[]>(() => sv?.merges ?? [])

  const [selectionStart, setSelectionStart] = useState<{r:number;c:number}|null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{r:number;c:number}|null>(null)
  const [activeCell, setActiveCell] = useState<{r:number;c:number}|null>(null)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [loadInfo, setLoadInfo] = useState(sv ? `Cache: ${(JSON.stringify(sv).length/1024).toFixed(0)}KB (${sv.numRows}f x ${sv.numCols}c)` : 'Cargando...')

  // Estado para botones con activación condicional
  const [editMode, setEditMode] = useState(false)
  const [btnHover, setBtnHover] = useState<string | null>(null)
  const [btnDown, setBtnDown] = useState<string | null>(null)

  // Lista de planteles CE para dropdown en celdas C15-C19
  const [ceList, setCeList] = useState<{nombre:string;localidad:string;ef:string}[]>([])
  const ceMapRef = useRef<Map<string,{localidad:string;ef:string}>>(new Map())
  useEffect(() => {
    fetch('/api/centros-escolares?limit=9999')
      .then(r => r.json())
      .then(data => {
        const list: {nombre:string;localidad:string;ef:string}[] = (data.centros || [])
        setCeList(list)
        const map = new Map<string,{localidad:string;ef:string}>()
        for (const ce of list) map.set(ce.nombre, { localidad: ce.localidad, ef: ce.ef })
        ceMapRef.current = map
      })
      .catch(() => {})
  }, [])

  const stateRef = useRef<SheetState>({ numRows, numCols, cells, colWidths, rowHeights, bgColors, textAligns, merges, fontFamilies, fontSizes, fontColors, borders, boldCells })
  stateRef.current = { numRows, numCols, cells, colWidths, rowHeights, bgColors, textAligns, merges, fontFamilies, fontSizes, fontColors, borders, boldCells }

  const initialCellsRef = useRef<string[][] | null>(null)
  const initialRawDataRef = useRef<string | null>(null)

  // Detectar si hay datos nuevos (diferentes al estado inicial) y no estamos en editMode
  const hasNewData = !editMode && initialCellsRef.current && (() => {
    const init = initialCellsRef.current!
    const cur = stateRef.current.cells
    for (const [campo, celda] of fieldMap) {
      const pos = cellRef(celda)
      if (!pos) continue
      const initVal = (init[pos.r]?.[pos.c] || '').trim()
      const curVal = (cur[pos.r]?.[pos.c] || '').trim()
      if (curVal && curVal !== initVal) return true
    }
    return false
  })()

  useEffect(() => { setLoaded(true) }, [])

  // === CARGAR DESDE BD (fuente principal) al montar ===
  useEffect(() => {
    if (!loaded) return
    loadFromDb(plan).then(dbState => {
      if (dbState) {
        setNumRows(dbState.numRows); setNumCols(dbState.numCols)
        setCells(dbState.cells); setColWidths(dbState.colWidths)
        setRowHeights(dbState.rowHeights); setBgColors(dbState.bgColors)
        setTextAligns(dbState.textAligns); setMerges(dbState.merges)
        setFontFamilies(dbState.fontFamilies); setFontSizes(dbState.fontSizes)
        setFontColors(dbState.fontColors); setBorders(dbState.borders)
        setBoldCells(dbState.boldCells)
        localStorage.setItem(STORAGE_KEY(plan), JSON.stringify(dbState))
        setLoadInfo(`BD: ${(JSON.stringify(dbState).length/1024).toFixed(0)}KB (${dbState.numRows}f x ${dbState.numCols}c)`)
      } else if (sv) {
        saveToDb(plan, sv).then(() => {
          setLoadInfo(`Cache→BD: ${(JSON.stringify(sv).length/1024).toFixed(0)}KB (${sv.numRows}f x ${sv.numCols}c)`)
        })
      } else {
        setLoadInfo('Plantilla por defecto')
      }
      setDbLoaded(true)
    })
  }, [loaded, plan])

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
          const filtered = prev.filter(m => { const overlap = !(m.er < nm.sr || m.sr > nm.er || m.ec < nm.sc || m.sc > nm.ec); return !overlap })
          return [...filtered, nm]
        })
        setCells(prev => { const copy = prev.map(r => [...r]); if (copy[btn.sr]) copy[btn.sr][btn.sc] = btn.label; return copy })
      }
    }
    const switchMerge: Merge = { sr: 5, sc: 35, er: 6, ec: 37 }
    if (!merges.some(m => m.sr === 5 && m.sc === 35 && m.er === 6 && m.ec === 37)) {
      setMerges(prev => {
        const filtered = prev.filter(m => { const overlap = !(m.er < switchMerge.sr || m.sr > switchMerge.er || m.ec < switchMerge.sc || m.sc > switchMerge.ec); return !overlap })
        return [...filtered, switchMerge]
      })
    }
    const hasBadMerge = merges.some(m => m.sr === 6 && m.sc === 30 && m.er === 7 && m.ec === 33)
    if (hasBadMerge) {
      setMerges(prev => prev.filter(m => !(m.sr === 6 && m.sc === 30 && m.er === 7 && m.ec === 33)))
      setCells(prev => { const copy = prev.map(r => [...r]); if (copy[6]) copy[6][30] = ''; return copy })
    }
    const printMerge: Merge = { sr: 5, sc: 30, er: 6, ec: 33 }
    if (!merges.some(m => m.sr === 5 && m.sc === 30 && m.er === 6 && m.ec === 33)) {
      setMerges(prev => {
        const filtered = prev.filter(m => { const overlap = !(m.er < printMerge.sr || m.sr > printMerge.er || m.ec < printMerge.sc || m.sc > printMerge.ec); return !overlap })
        return [...filtered, printMerge]
      })
      setCells(prev => { const copy = prev.map(r => [...r]); if (copy[5]) copy[5][30] = 'IMPRIMIR'; return copy })
    }
  }, [dbLoaded])

  // Guardar snapshot del estado inicial
  useEffect(() => {
    if (!dbLoaded || initialCellsRef.current) return
    initialCellsRef.current = cells.map(r => [...r])
  }, [dbLoaded, cells])

  const saveCountRef = useRef(0)
  const doSave = useCallback((p: string) => {
    try {
      const json = JSON.stringify(stateRef.current)
      localStorage.setItem(STORAGE_KEY(p), json)
      saveCountRef.current++
      setSaveStatus(`Save#${saveCountRef.current} ${(json.length/1024).toFixed(0)}KB`)
      return true
    } catch (e) { console.error('[SAVE ERROR]', e); setSaveStatus('ERROR SAVE'); return false }
  }, [])

  useEffect(() => {
    if (!loaded || !dbLoaded || editMode || hasNewData) return
    const timer = setTimeout(() => { doSave(plan); setTimeout(() => setSaveStatus(''), 2000) }, 300)
    return () => clearTimeout(timer)
  }, [loaded, dbLoaded, plan, editMode, cells, bgColors, borders, boldCells, colWidths, rowHeights, textAligns, fontFamilies, fontSizes, fontColors, merges, numRows, numCols, doSave])

  useEffect(() => {
    if (!loaded || !dbLoaded || editMode || hasNewData) return
    const timer = setTimeout(() => { saveToDb(plan, stateRef.current) }, 3000)
    return () => clearTimeout(timer)
  }, [loaded, dbLoaded, plan, editMode, cells, bgColors, borders, boldCells, colWidths, rowHeights, textAligns, fontFamilies, fontSizes, fontColors, merges, numRows, numCols])

  useEffect(() => {
    if (!loaded || !dbLoaded || editMode || hasNewData) return
    const handler = () => {
      try { const json = JSON.stringify(stateRef.current); localStorage.setItem(STORAGE_KEY(plan), json); navigator.sendBeacon(`/api/dashboard-state?plan=${plan}`, JSON.stringify({ datos: stateRef.current })) } catch {}
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [loaded, dbLoaded, plan, editMode, hasNewData])

  const handleRestore = () => {
    if (!confirm('Restaurar todo al diseño original? Se perderan todos los cambios.')) return
    localStorage.removeItem(STORAGE_KEY(plan))
    fetch(`/api/dashboard-state?plan=${plan}`, { method: 'DELETE' }).catch(() => {})
    setCells(tpl.makeInitialCells()); setColWidths(tpl.makeInitialWidths())
    setRowHeights(tpl.makeInitialHeights(INIT_ROWS)); setBgColors(tpl.makeInitialBg(INIT_ROWS, INIT_COLS))
    setTextAligns(tpl.makeInitialAlign(INIT_ROWS, INIT_COLS)); setMerges([])
    setNumRows(INIT_ROWS); setNumCols(INIT_COLS)
    setFontFamilies(tpl.makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
    setFontSizes(tpl.makeInitialFontSizes(INIT_ROWS, INIT_COLS))
    setFontColors(tpl.makeInitialFontColors(INIT_ROWS, INIT_COLS))
    setBorders(tpl.makeInitialBorders(INIT_ROWS, INIT_COLS))
    setBoldCells(tpl.makeInitialBold(INIT_ROWS, INIT_COLS))
    setSaveStatus('Restaurado'); setTimeout(() => setSaveStatus(''), 2000)
  }

  const isHidden = useCallback((r: number, c: number): boolean => {
    for (const m of merges) { if (r >= m.sr && r <= m.er && c >= m.sc && c <= m.ec) { if (r === m.sr && c === m.sc) return false; return true } } return false
  }, [merges])

  const getMerge = useCallback((r: number, c: number): Merge | null => {
    for (const m of merges) { if (r === m.sr && c === m.sc) return m } return null
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

  const colLetter = (i: number) => { let s = ''; let n = i; while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } return s }
  const colToIndex = (letters: string): number | null => { let idx = 0; for (let i = 0; i < letters.length; i++) { const ch = letters.charCodeAt(i); if (ch < 65 || ch > 90) return null; idx = idx * 26 + (ch - 64) } return idx - 1 }

  const [rangeInput, setRangeInput] = useState('')
  const applyRange = (input: string) => {
    const match = input.trim().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i)
    if (!match) return
    const c1 = colToIndex(match[1].toUpperCase()), r1 = parseInt(match[2]) - 1
    const c2 = colToIndex(match[3].toUpperCase()), r2 = parseInt(match[4]) - 1
    if (c1 == null || c2 == null) return
    setSelectionStart({ r: Math.min(r1, r2), c: Math.min(c1, c2) })
    setSelectionEnd({ r: Math.max(r1, r2), c: Math.max(c1, c2) })
  }
  const handleRangeSubmit = () => { applyRange(rangeInput) }

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
    while (isHidden(nr, nc) && tries < 500) { if(nr>r)nr++;else if(nr<r)nr--;else if(nc>c)nc++;else nc--; nr=Math.max(0,Math.min(nr,numRows-1));nc=Math.max(0,Math.min(nc,numCols-1));tries++ }
    setSelectedCell({ r: nr, c: nc }); setSelectionStart({ r: nr, c: nc }); setSelectionEnd({ r: nr, c: nc })
    setTimeout(() => focusInput(nr, nc), 0)
  }

  const selMinR = selectionStart && selectionEnd ? Math.min(selectionStart.r, selectionEnd.r) : -1
  const selMaxR = selectionStart && selectionEnd ? Math.max(selectionStart.r, selectionEnd.r) : -1
  const selMinC = selectionStart && selectionEnd ? Math.min(selectionStart.c, selectionEnd.c) : -1
  const selMaxC = selectionStart && selectionEnd ? Math.max(selectionStart.c, selectionEnd.c) : -1
  const isInSelection = (r: number, c: number) => { if (selMinR < 0) return false; return r >= selMinR && r <= selMaxR && c >= selMinC && c <= selMaxC }
  const hasSelection = selMinR >= 0 && (selMinR !== selMaxR || selMinC !== selMaxC)

  const applyToSelection = (arr: any[][], val: any, setter: (v: any[][]) => void) => {
    if (selMinR < 0) return
    setter(arr.map((row, ri) => row.map((cell, ci) => ri >= selMinR && ri <= selMaxR && ci >= selMinC && ci <= selMaxC ? val : cell)))
  }
  const handleMerge = () => { if (!hasSelection) return; const newMerge: Merge = { sr: selMinR, sc: selMinC, er: selMaxR, ec: selMaxC }; const filtered = merges.filter(m => { const overlap = !(m.er < newMerge.sr || m.sr > newMerge.er || m.ec < newMerge.sc || m.sc > newMerge.ec); return !overlap }); setMerges([...filtered, newMerge]); setSelectionStart(null); setSelectionEnd(null) }
  const handleUnmerge = () => { if (!selectedCell) return; setMerges(prev => prev.filter(m => !(m.sr === selectedCell.r && m.sc === selectedCell.c))) }
  const handleSetAlign = (align: Align) => { if (selMinR < 0) return; applyToSelection(textAligns, align, setTextAligns) }
  const handleApplyBgToSelection = (color: string) => { if (selMinR < 0) return; applyToSelection(bgColors, color, setBgColors) }
  const handleSetFont = (font: string) => { if (selMinR < 0) return; applyToSelection(fontFamilies, font, setFontFamilies) }
  const handleSetFontSize = (size: number) => { if (selMinR < 0) return; applyToSelection(fontSizes, size, setFontSizes) }
  const handleSetFontColor = (color: string) => { if (selMinR < 0) return; applyToSelection(fontColors, color, setFontColors) }
  const handleToggleBorders = (val: boolean) => { if (selMinR < 0) return; applyToSelection(borders, val, setBorders) }
  const handleToggleBold = () => { if (!selectedCell) return; const current = boldCells[selectedCell.r]?.[selectedCell.c] ?? false; applyToSelection(boldCells, !current, setBoldCells) }

  const handleInsertRow = (after: boolean) => {
    if (!selectedCell) return
    const at = after ? selectedCell.r + 1 : selectedCell.r
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

  const formatDateYY = (val: string): string => {
    const trimmed = val.trim()
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
    if (m) { const dd = m[1].padStart(2, '0'); const mm = m[2].padStart(2, '0'); let yy = parseInt(m[3]); yy = yy >= 30 ? 1900 + yy : 2000 + yy; return `${dd}/${mm}/${yy}` }
    return trimmed
  }
  const handleInputBlur = (r: number, c: number, value: string, target?: HTMLInputElement | null) => {
    if ((r === 3 && c === 25) || (r === 5 && c === 12)) { value = formatDateYY(value); if (target) target.value = value }
    updateCell(r, c, value); setActiveCell(null)
  }
  const navigateTo = (r: number, c: number) => {
    let nr = r, nc = c, tries = 0
    while (isHidden(nr, nc) && tries < 500) { if(nr>nr)nr++;else if(nr<r)nr--;else if(nc>c)nc++;else nc--; nr=Math.max(0,Math.min(nr,numRows-1));nc=Math.max(0,Math.min(nc,numCols-1));tries++ }
    setSelectedCell({r:nr,c:nc}); setSelectionStart({r:nr,c:nc}); setSelectionEnd({r:nr,c:nc}); setTimeout(()=>focusInput(nr,nc),0)
  }
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    let val = e.currentTarget.value
    if (((r === 3 && c === 25) || (r === 5 && c === 12)) && (e.key==='Enter'||e.key==='Tab')) { val = formatDateYY(val); e.currentTarget.value = val }
    if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();updateCell(r,c,val);navigateTo(r+1,c)}
    else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();updateCell(r,c,val);navigateTo(r,e.shiftKey?c-1:c+1)}
    else if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)){updateCell(r,c,e.currentTarget.value)}
  }

  const isFullRowSelected = hasSelection && selMinC === 0 && selMaxC === numCols - 1
  const isFullColSelected = hasSelection && selMinR === 0 && selMaxR === numRows - 1
  const SWITCH_ROW = 5, SWITCH_COL = 35
  const PRINT_ROW = 5, PRINT_COL = 30
  const switchBtnLabel = plan === 'vigente' ? 'ir a\nPlan Derogado' : 'ir a\nPlan Vigente'

  // === ESTADO DE BÚSQUEDA Y EDICIÓN ===
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{id:string;cedula:string;apellidos:string;nombres:string}>>([])
  const [searching, setSearching] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [dataLoadKey, setDataLoadKey] = useState(0)

  // === ESTADO DE ELIMINACIÓN ===
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteQuery, setDeleteQuery] = useState('')
  const [deleteResults, setDeleteResults] = useState<Array<{id:string;cedula:string;apellidos:string;nombres:string;fechaNacimiento?:string;pais?:string;estado?:string;municipio?:string}>>([])
  const [deleteSearching, setDeleteSearching] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<typeof deleteResults[0] | null>(null)

  // Botones de comando
  const CMD_BUTTONS: CmdButton[] = [
    { sr: 7, sc: 25, label: 'Buscar / Editar Alumno', color: '#FF00FF', bgColor: '#ffffff', fontSize: 16, disableOnNewData: true, hoverColor1: '#fdf0ff', hoverColor2: '#f5ccff', hoverShadowColor: 'rgba(255,0,255,0.25)', downShadowColor: 'rgba(255,0,255,0.15)', mergeSpan: { er: 8, ec: 26 } },
    { sr: 9, sc: 25, label: 'Guardar Editado', color: '#90EE90', bgColor: '#ffffff', fontSize: 16, disabledColor: '#999999', disabledBgColor: '#f5f5f5', activeColor: '#32CD32', requiresEdit: true, hoverColor1: '#f0fff0', hoverColor2: '#c8f7c8', hoverShadowColor: 'rgba(50,205,50,0.25)', downShadowColor: 'rgba(50,205,50,0.15)', mergeSpan: { er: 10, ec: 26 } },
    { sr: 7, sc: 30, label: 'Guardar Datos', color: '#5BA8FF', bgColor: '#ffffff', fontSize: 16, disabledColor: '#999999', activeColor: '#5BA8FF', disableOnEdit: true, requiresNewData: true, hoverColor1: '#e8f4ff', hoverColor2: '#c0deff', hoverShadowColor: 'rgba(91,168,255,0.3)', downShadowColor: 'rgba(91,168,255,0.15)', mergeSpan: { er: 8, ec: 37 } },
    { sr: 9, sc: 30, label: 'Eliminar Datos', color: '#FF4444', bgColor: '#ffffff', fontSize: 16, disabledColor: '#999999', activeColor: '#FF4444', disableOnEdit: true, hoverColor1: '#fff0f0', hoverColor2: '#ffcccc', hoverShadowColor: 'rgba(255,68,68,0.3)', downShadowColor: 'rgba(255,68,68,0.15)', mergeSpan: { er: 10, ec: 37 } },
    { sr: 7, sc: 27, label: 'Exportar\nDatos', color: '#FF8C00', bgColor: '#ffffff', fontSize: 12, disabledColor: '#999999', disabledBgColor: '#f5f5f5', disableOnNewData: true, hoverColor1: '#fff5e6', hoverColor2: '#ffe0b3', hoverShadowColor: 'rgba(255,140,0,0.3)', downShadowColor: 'rgba(255,140,0,0.15)', mergeSpan: { er: 10, ec: 29 } },
  ]
  const isCmdBtn = (r: number, c: number, cellText?: string) => {
    const posBtn = CMD_BUTTONS.find(b => b.sr === r && b.sc === c)
    if (posBtn) return posBtn
    if (cellText) { const textBtn = CMD_BUTTONS.find(b => cellText.trim() === b.label); if (textBtn) return textBtn }
    return null
  }

  // === CONVERTIR RAWDATA → CLAVES PLANAS DEL FIELD_MAP ===
  const flattenRawData = (raw: Record<string, unknown>): Record<string, string> => {
    const out: Record<string, string> = {}
    if (!raw || typeof raw !== 'object') return out
    const rawKeys = Object.keys(raw)
    const hasFlatFieldMapKeys = rawKeys.some(k => /^[A-Z]/.test(k) && k.includes('.') && fieldMap.some(([fm]) => fm === k))

    // RAMA A: Claves planas → copiar directo
    if (hasFlatFieldMapKeys) {
      const fieldMapSet = new Set(fieldMap.map(([k]) => k))
      for (const key of rawKeys) { if (fieldMapSet.has(key) && raw[key] != null && raw[key] !== undefined) { const sv = String(raw[key]); if (sv) out[key] = sv } }
      return out
    }

    // RAMA A2: Plan Derogado con claves numéricas BD2 → buildDerogadoFlatMap
    if (plan === 'derogado') {
      const hasNumericKeys = rawKeys.some(k => /^\d+$/.test(k))
      if (hasNumericKeys) { return buildDerogadoFlatMap(raw as Record<string, any>) }
    }

    // RAMA B: structured_v1 o legacy numérico vigente
    if (raw._format === 'structured_v1') {
      const insts = raw.instituciones
      if (Array.isArray(insts)) { for (let i = 0; i < Math.min(insts.length, 5); i++) { const inst = insts[i] as Record<string, string> | null; if (!inst) continue; if (inst.denominacion) out[`INST.${i+1}`] = String(inst.denominacion).trim(); if (inst.localidad) out[`LOCAL.${i+1}`] = String(inst.localidad).trim(); if (inst.ef) out[`EF.${i+1}`] = String(inst.ef).trim() } }
      const cals = raw.calificaciones
      if (Array.isArray(cals)) { for (const c of cals) { const cal = c as Record<string, unknown>; const y = Number(cal.anioEscolar); if (!y || y < 1 || y > 5) continue; const a = (String(cal.abrev || '').toUpperCase().trim().replace('FSN','FS')); if (!a) continue; if (cal.nota) out[`NOTA.${a}.${y}`] = String(cal.nota).trim(); if (cal.eval) out[`EVAL.${a}.${y}`] = String(cal.eval).trim(); if (cal.mes) out[`MES.${a}.${y}`] = fmtDate(String(cal.mes).trim()); if (cal.anio) out[`AÑO.${a}.${y}`] = String(cal.anio).trim(); if (cal.inst) out[`INST.${a}.${y}`] = String(cal.inst).trim() } }
      const oris = raw.orientacion
      if (Array.isArray(oris)) { for (let i = 0; i < Math.min(oris.length, 5); i++) { const o = oris[i] as Record<string, string> | null; if (o?.literal) out[`OC.LITERAL.${i+1}`] = String(o.literal).trim() } }
      const grps = raw.grupos
      if (Array.isArray(grps)) { for (let i = 0; i < Math.min(grps.length, 5); i++) { const g = grps[i] as Record<string, string> | null; if (!g) continue; if (g.grupo) out[`PG.GRUPO.${i+1}`] = String(g.grupo).trim(); if (g.literal) out[`PG.LITERAL.${i+1}`] = String(g.literal).trim() } }
      const obs = raw.observaciones
      if (Array.isArray(obs)) { for (let i = 0; i < 4; i++) { if (obs[i]) out[`OBS.CERT.L${i+1}`] = String(obs[i]).trim() } }
      const obsNotas = raw.observacionesNotas
      if (Array.isArray(obsNotas)) { for (let i = 0; i < 3; i++) { if (obsNotas[i]) out[`OBS.NOTAS.L${i+1}`] = String(obsNotas[i]).trim() } }
      const obsBoleta = raw.observacionesBoleta
      if (Array.isArray(obsBoleta)) { for (let i = 0; i < 3; i++) { if (obsBoleta[i]) out[`OBS.BOLETA.L${i+1}`] = String(obsBoleta[i]).trim() } }
      const secs = raw.secciones
      if (Array.isArray(secs)) { for (let i = 0; i < Math.min(secs.length, 5); i++) { if (secs[i]) out[`SECCION.${i+1}`] = String(secs[i]).trim() } }
      if (raw.acta) out['TITULO.SERIAL'] = String(raw.acta).trim()
      if (raw.tituloExpedicion) out['TITULO.EXPEDICION'] = fmtDate(raw.tituloExpedicion)
      if (raw.actaAnio) out['TITULO.EGRESO'] = String(raw.actaAnio).trim()
      if (raw.actaFecha) out['CERT.EXPEDICION'] = fmtDate(raw.actaFecha)
      const litFinal = raw.literalesFinales
      if (Array.isArray(litFinal) && !Array.isArray(raw.grupos)) { for (let i = 0; i < Math.min(litFinal.length, 5); i++) { if (litFinal[i]) out[`PG.LITERAL.${i+1}`] = String(litFinal[i]).trim() } }
    }

    // Legacy numérico vigente
    const hasNumericKeys = rawKeys.some(k => /^\d+$/.test(k))
    if (hasNumericKeys) {
      for (let i = 0; i < 5; i++) { const nk = String(8 + i * 3); const lk = String(9 + i * 3); const ek = String(10 + i * 3); if (raw[nk]) out[`INST.${i+1}`] = String(raw[nk]).replace(/^\*/, '').trim(); if (raw[lk]) out[`LOCAL.${i+1}`] = String(raw[lk]).replace(/^\*/, '').trim(); if (raw[ek]) out[`EF.${i+1}`] = String(raw[ek]).trim() }
      const yearBlocks = [{ year: 1, start: 23, count: 7 },{ year: 2, start: 58, count: 7 },{ year: 3, start: 93, count: 8 },{ year: 4, start: 133, count: 9 },{ year: 5, start: 178, count: 10 }]
      const abrevsByYear: Record<number, string[]> = { 1: ['CA','IN','MA','EF','AP','CN','GH'], 2: ['CA','IN','MA','EF','AP','CN','GH'], 3: ['CA','IN','MA','EF','FI','QU','BI','GH'], 4: ['CA','IN','MA','EF','FI','QU','BI','GH','FS'], 5: ['CA','IN','MA','EF','FI','QU','BI','CT','GH','FS'] }
      for (const block of yearBlocks) { const abrevs = abrevsByYear[block.year] || []; for (let i = 0; i < block.count; i++) { const col = block.start + i * 5; const abrev = abrevs[i] || `M${i+1}`; if (raw[String(col)]) out[`NOTA.${abrev}.${block.year}`] = String(raw[String(col)]).trim(); if (raw[String(col + 1)]) out[`EVAL.${abrev}.${block.year}`] = String(raw[String(col + 1)]).trim(); if (raw[String(col + 2)]) out[`MES.${abrev}.${block.year}`] = fmtDate(String(raw[String(col + 2)]).trim()); if (raw[String(col + 3)]) out[`AÑO.${abrev}.${block.year}`] = String(raw[String(col + 3)]).trim(); if (raw[String(col + 4)]) out[`INST.${abrev}.${block.year}`] = String(raw[String(col + 4)]).trim() } }
      for (let i = 0; i < 5; i++) { if (raw[String(228 + i)]) out[`OC.LITERAL.${i+1}`] = String(raw[String(228 + i)]).trim() }
      for (let i = 0; i < 5; i++) { if (raw[String(233 + i)]) out[`PG.GRUPO.${i+1}`] = String(raw[String(233 + i)]).trim(); if (raw[String(238 + i)]) out[`PG.LITERAL.${i+1}`] = String(raw[String(238 + i)]).trim() }
      for (let i = 0; i < 5; i++) { if (raw[String(248 + i)]) out[`SECCION.${i+1}`] = String(raw[String(248 + i)]).trim() }
      const obsCertCols = [243, 244, 260, 261]; for (let i = 0; i < obsCertCols.length; i++) { if (raw[String(obsCertCols[i])]) out[`OBS.CERT.L${i+1}`] = String(raw[String(obsCertCols[i])]).trim() }
      const obsNotasCols = [245, 246, 247]; for (let i = 0; i < obsNotasCols.length; i++) { if (raw[String(obsNotasCols[i])]) out[`OBS.NOTAS.L${i+1}`] = String(raw[String(obsNotasCols[i])]).trim() }
      const obsBoletaCols = [257, 258, 259]; for (let i = 0; i < obsBoletaCols.length; i++) { if (raw[String(obsBoletaCols[i])]) out[`OBS.BOLETA.L${i+1}`] = String(raw[String(obsBoletaCols[i])]).trim() }
      if (raw['253']) out['TITULO.SERIAL'] = String(raw['253']).trim(); if (raw['254']) out['TITULO.EXPEDICION'] = fmtDate(raw['254']); if (raw['255']) out['TITULO.EGRESO'] = String(raw['255']).trim(); if (raw['256']) out['CERT.EXPEDICION'] = fmtDate(raw['256'])
    }

    // Fallback: claves planas del raw que coincidan con FIELD_MAP
    const fieldMapKeys = new Set(fieldMap.map(([k]) => k))
    for (const [key, val] of Object.entries(raw)) { if (fieldMapKeys.has(key) && val !== null && val !== undefined) { const sv = String(val); if (sv && !out[key]) out[key] = sv } }
    return out
  }

  // === BUSCAR ESTUDIANTE ===
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try { const res = await fetch(`/api/students?q=${encodeURIComponent(q.trim())}&plan=${plan}&limit=10`); const data = await res.json(); setSearchResults(data.students || []) } catch { setSearchResults([]) }
    setSearching(false)
  }, [plan])

  const doDeleteSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setDeleteResults([]); return }
    setDeleteSearching(true)
    try { const res = await fetch(`/api/students?q=${encodeURIComponent(q.trim())}&plan=${plan}&limit=10`); const data = await res.json(); setDeleteResults(data.students || []) } catch { setDeleteResults([]) }
    setDeleteSearching(false)
  }, [plan])

  const restoreInitialState = useCallback(() => {
    if (initialCellsRef.current) { setCells(initialCellsRef.current.map(r => [...r])) }
    setEditingStudentId(null); setDataLoadKey(k => k + 1); initialRawDataRef.current = null; setEditMode(false); setShowSearchModal(false); setShowDeleteModal(false)
  }, [])

  const doDeleteStudent = useCallback(async (studentId: string) => {
    try {
      setSaveStatus('ELIMINANDO...')
      const res = await fetch(`/api/students/${studentId}?plan=${plan}`, { method: 'DELETE' })
      if (!res.ok) { setSaveStatus('ERROR AL ELIMINAR'); setTimeout(() => setSaveStatus(''), 3000); return }
      setSaveStatus('REGISTRO ELIMINADO ✓'); setTimeout(() => setSaveStatus(''), 3000)
      setDeleteConfirm(null); setDeleteQuery(''); setDeleteResults([]); restoreInitialState()
    } catch (e) { console.error('[DELETE ERROR]', e); setSaveStatus('ERROR AL ELIMINAR'); setTimeout(() => setSaveStatus(''), 3000) }
  }, [plan, restoreInitialState])

  // === CARGAR DATOS DEL ESTUDIANTE AL DASHBOARD ===
  const loadStudentToDashboard = useCallback(async (studentId: string) => {
    try {
      const res = await fetch(`/api/students/${studentId}?plan=${plan}`)
      if (!res.ok) return
      const student = await res.json()
      if (!student || student.error) return
      setShowSearchModal(false); setSearchQuery(''); setSearchResults([])
      let rawObj: Record<string, unknown> = {}
      try { const rawStr = typeof student.rawData === 'string' ? student.rawData : JSON.stringify(student.rawData || {}); rawObj = JSON.parse(rawStr) } catch (e) { console.error('[LOAD] rawData parse error:', e) }
      initialRawDataRef.current = typeof student.rawData === 'string' ? student.rawData : JSON.stringify(student.rawData || {})
      const flat = flattenRawData(rawObj)
      const vals: Record<string, string> = {}
      vals['CEDULA'] = student.cedula || ''; vals['FECHA'] = fmtDate(student.fechaNacimiento || '')
      vals['APELLIDOS'] = student.apellidos || ''; vals['NOMBRES'] = student.nombres || ''
      vals['PAIS'] = student.pais || ''; vals['ESTADO'] = student.estado || ''; vals['MUNICIPIO'] = student.municipio || ''
      for (const [campo, valor] of Object.entries(flat)) { if (valor) vals[campo] = String(valor) }
      let notaSum = 0, notaCount = 0
      const fieldPositions: Array<[string, string, {r:number;c:number}|null]> = []
      for (const [campo, celda] of fieldMap) { const pos = cellRef(celda); const val = vals[campo] || ''; fieldPositions.push([campo, val, pos]); if (campo.startsWith('NOTA.')) { const n = parseFloat(val); if (!isNaN(n) && n >= 1 && n <= 20) { notaSum += n; notaCount++ } } }
      const promedioVal = PROMEDIO_CELL && notaCount > 0 ? (notaSum / notaCount).toFixed(2) : ''
      const totalVals = Object.keys(vals).length
      const nonEmptyFields = fieldPositions.filter(([, val, pos]) => pos && val).length
      setEditingStudentId(student.id); setDataLoadKey(k => k + 1)
      setCells(prev => {
        if (!initialCellsRef.current) { initialCellsRef.current = prev.map(row => [...row]) }
        const newCells = prev.map(row => [...row])
        let appliedCount = 0
        for (const [campo, val, pos] of fieldPositions) { if (pos && newCells[pos.r] && val) { newCells[pos.r][pos.c] = val; appliedCount++ } }
        if (PROMEDIO_CELL && promedioVal) { if (newCells[PROMEDIO_CELL.r]) newCells[PROMEDIO_CELL.r][PROMEDIO_CELL.c] = promedioVal }
        return newCells
      })
      setSaveStatus(`CARGADO: ${nonEmptyFields} de ${totalVals} vals | ${Object.keys(flat).length} del rawData`)
      setTimeout(() => setSaveStatus(''), 6000)
      setEditMode(true)
    } catch (e) { console.error('[LOAD STUDENT ERROR]', e) }
  }, [plan])

  // === GUARDAR NUEVO REGISTRO EN BD ===
  const saveNewStudent = useCallback(async () => {
    const currentCells = stateRef.current.cells
    const m5 = cellRef('M5'); const cedula = m5 ? (currentCells[m5.r]?.[m5.c] || '').trim() : ''
    if (!cedula || cedula.includes('*')) { if (!window.confirm('La cédula está vacía o contiene asteriscos.\nDebe tener el formato: V 12345678\n¿Corregir o cancelar?')) { restoreInitialState(); return }; return }
    const cedulaRegex = /^[VEPDC] \d{8}$|^[VEPDC] \d{11}$/
    if (!cedulaRegex.test(cedula)) { if (!window.confirm(`Formato de cédula inválido: "${cedula}"\n¿Corregir o cancelar?`)) { restoreInitialState(); return }; return }
    try {
      setSaveStatus('VERIFICANDO CÉDULA...')
      const checkRes = await fetch(`/api/students?cedula_exact=${encodeURIComponent(cedula)}&plan=${plan}`)
      const checkData = await checkRes.json()
      if (checkData.exists) { setSaveStatus(''); if (!window.confirm(`Ya existe un alumno con la cédula: "${cedula}"\n¿Corregir o cancelar?`)) { restoreInitialState(); return }; return }
    } catch { setSaveStatus(''); if (!window.confirm('No se pudo verificar si la cédula ya existe.\n¿Intentar de nuevo o cancelar?')) { restoreInitialState(); return }; return }
    const rawData: Record<string, string> = {}
    for (const [campo, celda] of fieldMap) { const pos = cellRef(celda); if (pos) rawData[campo] = currentCells[pos.r]?.[pos.c] || '' }
    const m6 = cellRef('M6'), m7 = cellRef('M7'), m8 = cellRef('M8'), m9 = cellRef('M9'), m10 = cellRef('M10'), m11 = cellRef('M11')
    const newStudent = { cedula, apellidos: m7 ? (currentCells[m7.r]?.[m7.c] || '').trim() : '', nombres: m8 ? (currentCells[m8.r]?.[m8.c] || '').trim() : '', fechaNacimiento: m6 ? (currentCells[m6.r]?.[m6.c] || '').trim() : '', pais: m9 ? (currentCells[m9.r]?.[m9.c] || '').trim() : 'VENEZUELA', estado: m10 ? (currentCells[m10.r]?.[m10.c] || '').trim() : '', municipio: m11 ? (currentCells[m11.r]?.[m11.c] || '').trim() : '', rawData: JSON.stringify(rawData), plan }
    try {
      setSaveStatus('GUARDANDO NUEVO REGISTRO...')
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStudent) })
      const result = await res.json()
      if (!res.ok) { setSaveStatus(''); if (!window.confirm(`Error al guardar: ${result.error || 'desconocido'}\n¿Corregir o cancelar?`)) { restoreInitialState(); return }; return }
      setSaveStatus('NUEVO REGISTRO GUARDADO ✓'); setTimeout(() => setSaveStatus(''), 3000); restoreInitialState()
    } catch (e) { console.error('[SAVE NEW ERROR]', e); setSaveStatus(''); if (!window.confirm('Error de conexión al guardar el nuevo registro.\n¿Intentar de nuevo o cancelar?')) { restoreInitialState(); return } }
  }, [plan, restoreInitialState])

  // === GUARDAR EDICIÓN EN BD Y RESTAURAR ===
  const saveEditedStudent = useCallback(async () => {
    if (!editingStudentId) return
    try {
      const currentCells = stateRef.current.cells
      const studentData = await fetch(`/api/students/${editingStudentId}?plan=${plan}`)
      const student = await studentData.json()
      let originalRaw: Record<string, unknown> = {}
      try { originalRaw = JSON.parse(student.rawData || '{}') } catch {}
      const edits: Record<string, string> = {}
      for (const [campo, celda] of fieldMap) { const pos = cellRef(celda); if (!pos) continue; edits[campo] = currentCells[pos.r]?.[pos.c] || '' }
      for (const [campo, valor] of Object.entries(edits)) { originalRaw[campo] = valor }
      const m5 = cellRef('M5'), m6 = cellRef('M6'), m7 = cellRef('M7'), m8 = cellRef('M8'), m9 = cellRef('M9'), m10 = cellRef('M10'), m11 = cellRef('M11')
      const updateData: Record<string, string> = {}
      if (m5) updateData.cedula = currentCells[m5.r]?.[m5.c] || ""
      if (m6) updateData.fechaNacimiento = currentCells[m6.r]?.[m6.c] || ""
      if (m7) updateData.apellidos = currentCells[m7.r]?.[m7.c] || ""
      if (m8) updateData.nombres = currentCells[m8.r]?.[m8.c] || ""
      if (m9) updateData.pais = currentCells[m9.r]?.[m9.c] || ""
      if (m10) updateData.estado = currentCells[m10.r]?.[m10.c] || ""
      if (m11) updateData.municipio = currentCells[m11.r]?.[m11.c] || ""
      updateData.rawData = JSON.stringify(originalRaw)
      await fetch(`/api/students/${editingStudentId}?plan=${plan}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) })
      restoreInitialState(); setSaveStatus('DATOS GUARDADOS ✓'); setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) { console.error('[SAVE EDITED ERROR]', e); setSaveStatus('ERROR AL GUARDAR'); setTimeout(() => setSaveStatus(''), 3000) }
  }, [editingStudentId, restoreInitialState, plan])

  return (
    <div className="overflow-auto">
      {/* TOOLBAR ROW 1 */}
      <div className="sticky top-0 z-30 bg-gray-800 text-white text-[10px] px-3 py-1.5 flex flex-wrap items-center gap-1.5">
        <span className="font-bold text-[10px]">Plan: {plan.toUpperCase()}</span>
        <button onClick={handleToggleBold} disabled={!selectedCell} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px] font-bold border border-gray-500" title="Negrita">B</button>
        <button onClick={() => handleSetAlign('left')} className="bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-[9px] border border-gray-500" title="Izquierda"><span className="inline-block w-3" style={{textAlign:'left'}}>▸</span></button>
        <button onClick={() => handleSetAlign('center')} className="bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-[9px] border border-gray-500" title="Centrar"><span className="inline-block w-3" style={{textAlign:'center'}}>▸</span></button>
        <button onClick={() => handleSetAlign('right')} className="bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-[9px] border border-gray-500" title="Derecha"><span className="inline-block w-3" style={{textAlign:'right'}}>◂</span></button>
        <span className="text-gray-600">|</span>
        <select onChange={e => handleSetFont(e.target.value)} disabled={!selectedCell} className="bg-gray-700 text-white text-[9px] px-1 py-0.5 rounded border border-gray-500 disabled:opacity-40" title="Tipo de fuente" style={{maxWidth:'110px'}}>{FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select>
        <input type="number" value={selectedCell ? (fontSizes[selectedCell.r]?.[selectedCell.c] || 9) : 9} onChange={e => handleSetFontSize(parseInt(e.target.value) || 9)} disabled={!selectedCell} className="w-10 bg-gray-700 text-white text-[9px] px-1 rounded text-center border border-gray-500 disabled:opacity-40" title="Tamaño fuente" />px
        <span title="Color de texto" className="relative"><span className="text-[9px]">A</span><input type="color" value={selectedCell ? (fontColors[selectedCell.r]?.[selectedCell.c] || '#333333') : '#333333'} onChange={e => handleSetFontColor(e.target.value)} disabled={!selectedCell} className="w-5 h-4 cursor-pointer absolute -top-0.5 left-3 opacity-60" /></span>
        <span className="text-gray-600">|</span>
        <button onClick={handleMerge} disabled={!hasSelection} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">Combinar</button>
        <button onClick={handleUnmerge} disabled={!selectedCell||!getMerge(selectedCell.r,selectedCell.c)} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">Descomb.</button>
        <span className="text-gray-600">|</span>
        <button onClick={()=>handleInsertRow(false)} disabled={!selectedCell} className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar fila arriba">+F</button>
        <button onClick={()=>handleInsertRow(true)} disabled={!selectedCell} className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar fila abajo">+F↓</button>
        <button onClick={()=>handleInsertCol(false)} disabled={!selectedCell} className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar columna izquierda">+C</button>
        <button onClick={()=>handleInsertCol(true)} disabled={!selectedCell} className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]" title="Insertar columna derecha">+C→</button>
        <button onClick={handleDeleteRow} disabled={!selectedCell||numRows<=1} className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">-F</button>
        <button onClick={handleDeleteCol} disabled={!selectedCell||numCols<=1} className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">-C</button>
        <span className="text-gray-600">|</span>
        <button onClick={()=>handleMoveRow('up')} disabled={!selectedCell||selMinR===0} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">F↑</button>
        <button onClick={()=>handleMoveRow('down')} disabled={!selectedCell||selMaxR>=numRows-1} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">F↓</button>
        <button onClick={()=>handleMoveCol('left')} disabled={!selectedCell||selMinC===0} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">C←</button>
        <button onClick={()=>handleMoveCol('right')} disabled={!selectedCell||selMaxC>=numCols-1} className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-1.5 py-0.5 rounded text-[9px]">C→</button>
        <span className="text-gray-600">|</span>
        {hasSelection && <span className="text-yellow-300">{colLetter(selMinC)}{selMinR+1}:{colLetter(selMaxC)}{selMaxR+1} ({selMaxR-selMinR+1}f x {selMaxC-selMinC+1}c)</span>}
        <span className="text-cyan-300 text-[8px]">{loadInfo}</span>
        {saveStatus && <span className={saveStatus.includes('ERROR') ? 'text-red-400' : 'text-green-400'}>{saveStatus}</span>}
        <button onClick={async () => { try { const json = JSON.stringify(stateRef.current); localStorage.setItem(STORAGE_KEY(plan), json); await saveToDb(plan, stateRef.current); saveCountRef.current++; setSaveStatus(`GUARDADO #${saveCountRef.current} (BD+Cache) ${(json.length/1024).toFixed(0)}KB ✓`) } catch (e) { setSaveStatus('ERROR: ' + (e as Error).message) }; setTimeout(() => setSaveStatus(''), 4000) }} className="bg-green-700 hover:bg-green-600 px-3 py-0.5 rounded text-[10px] font-bold">GUARDAR</button>
        <button onClick={handleRestore} className="bg-red-800 hover:bg-red-700 px-2 py-0.5 rounded text-[9px]">Restaurar</button>
        <span className="text-gray-600">|</span>
        <input type="text" value={rangeInput} onChange={e => setRangeInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRangeSubmit() } }} placeholder="A1:D5" className="w-16 bg-gray-700 text-yellow-300 text-[9px] px-1 py-0.5 rounded border border-gray-500 placeholder-gray-500 text-center" title="Escribe rango y presiona Enter" />
        <span className="text-gray-400 ml-auto">{numRows}f x {numCols}c</span>
      </div>

      {/* TOOLBAR ROW 2 */}
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

      <table ref={tableRef} className="border-separate border-spacing-0" onKeyDown={handleKeyDown} style={{ marginTop: selectedCell ? '52px' : '28px' }}>
        <colgroup><col style={{ width: '35px' }} />{colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}</colgroup>
        <tbody>
          <tr><td className="border border-gray-400 bg-gray-300 text-[8px] text-center text-gray-600 sticky left-0 z-20" style={{ top: selectedCell ? '52px' : '28px' }}></td>
            {Array.from({ length: numCols }).map((_, c) => { const colSel = selMinC <= c && c <= selMaxC && selMinR === 0 && selMaxR === numRows - 1; return (<td key={c} onClick={(e) => handleColHeaderClick(c, e.shiftKey)} className={`border border-gray-400 text-[8px] text-center font-mono cursor-pointer select-none ${colSel ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} style={{ top: selectedCell ? '52px' : '28px', position: 'sticky', zIndex: 15 }}>{colLetter(c)}</td>) })}
          </tr>
          {Array.from({ length: numRows }).map((_, r) => (
            <tr key={r} style={{ height: `${rowHeights[r] || 20}px` }}>
              <td onClick={(e) => handleRowHeaderClick(r, e.shiftKey)} className={`border border-gray-400 text-[8px] text-center cursor-pointer select-none sticky left-0 z-5 ${selMinR<=r&&r<=selMaxR&&selMinC===0&&selMaxC===numCols-1?'bg-blue-400 text-white':'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{r + 1}</td>
              {Array.from({ length: numCols }).map((_, c) => {
                if (isHidden(r, c) && !CMD_BUTTONS.find(b => b.sr === r && b.sc === c)) return null
                const merge = getMerge(r, c)
                const colSpan = merge ? (merge.ec - merge.sc + 1) : 1
                const rowSpan = merge ? (merge.er - merge.sr + 1) : 1
                const selected = isInSelection(r, c)
                const cellBorder = borders[r]?.[c] !== false
                const isSwitchCell = r === SWITCH_ROW && c === SWITCH_COL
                const isPrintCell = r === PRINT_ROW && c === PRINT_COL
                const cmdBtn = isCmdBtn(r, c, cells[r]?.[c])
                const isBtnCell = isSwitchCell || isPrintCell || !!cmdBtn
                const cmdDisabled = cmdBtn ? ((cmdBtn.requiresEdit && !editMode) || (cmdBtn.disableOnEdit && editMode) || (cmdBtn.disableOnDerogado && plan === 'derogado') || (cmdBtn.disableOnNewData && hasNewData) || (cmdBtn.requiresNewData && !hasNewData)) : false
                const btnKey = `${r}-${c}`
                const isHov = btnHover === btnKey
                const isDn = btnDown === btnKey
                const isCeDropdown = ceList.length > 0 && ((c === 2 && r >= 14 && r <= 18) || (c === 2 && r >= 20 && r <= 24))
                return (
                  <td key={c} data-r={r} data-c={c} onClick={(e) => { if (!isBtnCell) handleCellClick(r, c, e.shiftKey) }} colSpan={colSpan > 1 ? colSpan : undefined} rowSpan={rowSpan > 1 ? rowSpan : undefined} className={`p-0 relative ${selected && !isBtnCell ? 'ring-2 ring-blue-400 z-10' : ''} ${cellBorder ? 'border border-gray-400' : ''}`} style={{ backgroundColor: selected ? '#bbdefb' : (bgColors[r]?.[c] || '#ffffff'), color: fontColors[r]?.[c] || '#333', fontWeight: boldCells[r]?.[c] ? 'bold' : 'normal', fontStyle: 'normal', fontSize: `${fontSizes[r]?.[c] || 9}px`, fontFamily: fontFamilies[r]?.[c] || 'Arial', textAlign: textAligns[r]?.[c] || 'left', verticalAlign: 'middle' }}>
                    {isSwitchCell ? (
                      <button onClick={(e) => { e.stopPropagation(); if (!editMode) doSave(plan); if (editMode) restoreInitialState(); onSwitchPlan() }} onMouseEnter={() => setBtnHover(btnKey)} onMouseLeave={() => { setBtnHover(null); setBtnDown(null) }} onMouseDown={() => setBtnDown(btnKey)} onMouseUp={() => setBtnDown(null)} className="w-full h-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: isDn ? '#1d4ed8' : '#2563eb', color: '#ffffff', fontSize: '11px', fontFamily: 'Arial', fontWeight: 'bold', border: '1px solid #1e40af', borderRadius: '2px', userSelect: 'none', whiteSpace: 'pre-line', boxShadow: isDn ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : '1px 1px 3px rgba(0,0,0,0.3)', transform: isDn ? 'translateY(1px)' : 'none' }}>{switchBtnLabel}</button>
                    ) : isPrintCell ? (
                      <button onClick={(e) => { e.stopPropagation(); window.print() }} onMouseEnter={() => setBtnHover(btnKey)} onMouseLeave={() => { setBtnHover(null); setBtnDown(null) }} onMouseDown={() => setBtnDown(btnKey)} onMouseUp={() => setBtnDown(null)} className="w-full h-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: '#ffffff', color: '#000000', fontSize: '12px', fontFamily: 'Arial', fontWeight: 'bold', border: '1px solid #333333', borderRadius: '2px', userSelect: 'none', whiteSpace: 'nowrap', boxShadow: isDn ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : '1px 1px 3px rgba(0,0,0,0.3)', transform: isDn ? 'translateY(1px)' : 'none' }}>IMPRIMIR</button>
                    ) : cmdBtn ? (
                      <button disabled={cmdDisabled} onClick={(e) => { e.stopPropagation(); if (cmdBtn.label === 'Buscar / Editar Alumno') { setShowSearchModal(true) } else if (cmdBtn.label === 'Guardar Editado') { saveEditedStudent() } else if (cmdBtn.label === 'Guardar Datos') { saveNewStudent() } else if (cmdBtn.label === 'Eliminar Datos') { setShowDeleteModal(true) } else if (cmdBtn.label === 'Exportar\nDatos') { window.open('/api/export?plan=' + plan, '_blank') } }} onMouseEnter={() => setBtnHover(btnKey)} onMouseLeave={() => { setBtnHover(null); setBtnDown(null) }} onMouseDown={() => setBtnDown(btnKey)} onMouseUp={() => setBtnDown(null)} className="w-full h-full flex items-center justify-center" style={{ backgroundColor: cmdDisabled ? (cmdBtn.disabledBgColor || '#f5f5f5') : (isHov ? (cmdBtn.hoverColor1 || '#f0f0f0') : (cmdBtn.bgColor || '#ffffff')), color: cmdDisabled ? (cmdBtn.disabledColor || '#aaaaaa') : cmdBtn.color, fontSize: `${cmdBtn.fontSize}px`, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', lineHeight: 'normal', border: `2px solid ${cmdDisabled ? (cmdBtn.disabledColor || '#cccccc') : cmdBtn.color}`, borderRadius: '4px', boxShadow: cmdDisabled ? 'none' : (isDn ? `inset 0 1px 3px ${cmdBtn.downShadowColor || 'rgba(0,0,0,0.15)'}` : (isHov ? `2px 2px 6px ${cmdBtn.hoverShadowColor || 'rgba(0,0,0,0.2)'}` : '1px 1px 3px rgba(0,0,0,0.2)')), transform: isDn ? 'translateY(1px)' : 'none', userSelect: 'none', whiteSpace: 'pre-line', opacity: 1, cursor: cmdDisabled ? 'not-allowed' : 'pointer' }}>{cmdBtn.label}</button>
                    ) : (
                      <input key={`${r}-${c}-${editingStudentId || '_'}-${dataLoadKey}`} type="text" defaultValue={cells[r]?.[c] || ''} list={isCeDropdown ? 'ce-datalist' : undefined} onInput={isCeDropdown ? (e) => { const val = (e.target as HTMLInputElement).value; const ce = ceMapRef.current.get(val); if (ce) { updateCell(r, 8, ce.localidad); updateCell(r, 11, ce.ef); const tdI = tableRef.current?.querySelector(`[data-r="${r}"][data-c="8"]`); if (tdI) { const inp = tdI.querySelector('input') as HTMLInputElement; if (inp) inp.value = ce.localidad } const tdL = tableRef.current?.querySelector(`[data-r="${r}"][data-c="11"]`); if (tdL) { const inp = tdL.querySelector('input') as HTMLInputElement; if (inp) inp.value = ce.ef } } } : undefined} onBlur={(e) => handleInputBlur(r, c, e.target.value, e.target)} onFocus={() => { setActiveCell({r,c}); setSelectedCell({r,c}); setSelectionStart({r,c}); setSelectionEnd({r,c}) }} onKeyDown={(e) => handleInputKeyDown(e, r, c)} className="w-full h-full bg-transparent border-0 outline-none p-0 px-0.5" style={{ color: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', textAlign: 'inherit', minHeight: `${rowHeights[r] || 20}px`, lineHeight: `${rowHeights[r] || 20}px` }} />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {ceList.length > 0 && (<datalist id="ce-datalist">{ceList.map(ce => (<option key={ce.nombre} value={ce.nombre} />))}</datalist>)}

      {/* MODAL DE BÚSQUEDA */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" style={{ marginTop: '0' }}>
          <div className="bg-white rounded-lg shadow-2xl p-4 w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-800">Buscar / Editar Alumno</h3>
              <button onClick={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]) }} className="text-gray-500 hover:text-red-500 text-lg leading-none font-bold">&times;</button>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Cedula o Nombre del alumno..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value.length >= 2) doSearch(e.target.value) }} onKeyDown={e => { if (e.key === 'Enter') doSearch(searchQuery) }} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
              {searching && <div className="text-xs text-gray-500 text-center py-2">Buscando...</div>}
              {searchResults.length > 0 && (<div className="max-h-60 overflow-y-auto border border-gray-200 rounded">{searchResults.map(s => (<button key={s.id} onClick={() => loadStudentToDashboard(s.id)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-gray-100 last:border-0 cursor-pointer"><span className="font-bold">{s.cedula}</span> - {s.apellidos}, {s.nombres}</button>))}</div>)}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && <div className="text-xs text-red-500 text-center py-2">No se encontraron alumnos</div>}
              {searchQuery.length < 2 && <div className="text-xs text-gray-400 text-center py-2">Escriba al menos 2 caracteres para buscar</div>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINAR */}
      {showDeleteModal && !deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" style={{ marginTop: '0' }}>
          <div className="bg-white rounded-lg shadow-2xl p-4 w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-red-600">Eliminar Registro</h3>
              <button onClick={() => { setShowDeleteModal(false); setDeleteQuery(''); setDeleteResults([]) }} className="text-gray-500 hover:text-red-500 text-lg leading-none font-bold">&times;</button>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Cédula del alumno a eliminar..." value={deleteQuery} onChange={e => { setDeleteQuery(e.target.value); if (e.target.value.length >= 2) doDeleteSearch(e.target.value) }} onKeyDown={e => { if (e.key === 'Enter') doDeleteSearch(deleteQuery) }} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" autoFocus />
              {deleteSearching && <div className="text-xs text-gray-500 text-center py-2">Buscando...</div>}
              {deleteResults.length > 0 && (<div className="max-h-60 overflow-y-auto border border-gray-200 rounded">{deleteResults.map(s => (<button key={s.id} onClick={() => setDeleteConfirm(s)} className="w-full text-left px-3 py-2 hover:bg-red-50 text-xs border-b border-gray-100 last:border-0 cursor-pointer"><span className="font-bold">{s.cedula}</span> - {s.apellidos}, {s.nombres}</button>))}</div>)}
              {!deleteSearching && deleteQuery.length >= 2 && deleteResults.length === 0 && <div className="text-xs text-red-500 text-center py-2">No se encontraron alumnos</div>}
              {deleteQuery.length < 2 && <div className="text-xs text-gray-400 text-center py-2">Escriba al menos 2 caracteres para buscar</div>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showDeleteModal && deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" style={{ marginTop: '0' }}>
          <div className="bg-white rounded-lg shadow-2xl p-5 w-[420px] max-w-[90vw]">
            <h3 className="text-sm font-bold text-red-600 mb-3">Confirmar Eliminación</h3>
            <p className="text-xs text-gray-700 mb-3">El siguiente registro será eliminado de la base de datos <b>Plan {plan.toUpperCase()}</b>:</p>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 space-y-1 text-xs">
              <div><b>Cédula:</b> {deleteConfirm.cedula}</div>
              <div><b>Fecha de Nacimiento:</b> {deleteConfirm.fechaNacimiento || '-'}</div>
              <div><b>Apellidos:</b> {deleteConfirm.apellidos}</div>
              <div><b>Nombres:</b> {deleteConfirm.nombres}</div>
              <div><b>País:</b> {deleteConfirm.pais || '-'}</div>
              <div><b>Estado:</b> {deleteConfirm.estado || '-'}</div>
              <div><b>Municipio:</b> {deleteConfirm.municipio || '-'}</div>
            </div>
            <p className="text-xs text-red-600 font-bold mb-4">¿Está de acuerdo?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteConfirm(null); setShowDeleteModal(false); setDeleteQuery(''); setDeleteResults([]); restoreInitialState() }} className="px-4 py-2 text-xs font-bold border-2 border-gray-400 text-gray-600 rounded hover:bg-gray-100">NO</button>
              <button onClick={() => doDeleteStudent(deleteConfirm.id)} className="px-4 py-2 text-xs font-bold border-2 border-red-500 text-white bg-red-500 rounded hover:bg-red-600">SI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>(() => {
    if (typeof window !== 'undefined') { const stored = localStorage.getItem('jo-sigae-current-plan'); return stored === 'derogado' ? 'derogado' : 'vigente' }
    return 'vigente'
  })
  const handleSwitch = () => { const newPlan = plan === 'vigente' ? 'derogado' : 'vigente'; setPlan(newPlan); localStorage.setItem('jo-sigae-current-plan', newPlan); window.dispatchEvent(new Event('plan-changed')) }
  return (
    <AppShell>
      <SheetEditor key={plan} plan={plan} onSwitchPlan={handleSwitch} />
    </AppShell>
  )
}
