'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'

const INIT_COLS = 40
const INIT_ROWS = 51

type Align = 'left' | 'center' | 'right'
interface Merge { sr: number; sc: number; er: number; ec: number }

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
  borders: boolean[][]
}

function loadFromStorage(plan: string): SheetState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY(plan))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveToStorage(plan: string, state: SheetState) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY(plan), JSON.stringify(state)) } catch {}
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [numRows, setNumRows] = useState(INIT_ROWS)
  const [numCols, setNumCols] = useState(INIT_COLS)

  const [cells, setCells] = useState<string[][]>(makeInitialCells)
  const [colWidths, setColWidths] = useState<number[]>(makeInitialWidths)
  const [rowHeights, setRowHeights] = useState<number[]>(() => makeInitialHeights(INIT_ROWS))
  const [bgColors, setBgColors] = useState<string[][]>(() => makeInitialBg(INIT_ROWS, INIT_COLS))
  const [textAligns, setTextAligns] = useState<Align[][]>(() => makeInitialAlign(INIT_ROWS, INIT_COLS))
  const [fontFamilies, setFontFamilies] = useState<string[][]>(() => makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
  const [fontSizes, setFontSizes] = useState<number[][]>(() => makeInitialFontSizes(INIT_ROWS, INIT_COLS))
  const [fontColors, setFontColors] = useState<string[][]>(() => makeInitialFontColors(INIT_ROWS, INIT_COLS))
  const [borders, setBorders] = useState<boolean[][]>(() => makeInitialBorders(INIT_ROWS, INIT_COLS))

  const [merges, setMerges] = useState<Merge[]>([])
  const [selectionStart, setSelectionStart] = useState<{r:number;c:number}|null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{r:number;c:number}|null>(null)
  const [activeCell, setActiveCell] = useState<{r:number;c:number}|null>(null)
  const [saveStatus, setSaveStatus] = useState<string>('')

  // === LOAD FROM STORAGE ===
  useEffect(() => {
    const saved = loadFromStorage(plan)
    if (saved) {
      if (saved.cells) setCells(saved.cells)
      if (saved.colWidths) setColWidths(saved.colWidths)
      if (saved.rowHeights) setRowHeights(saved.rowHeights)
      if (saved.bgColors) setBgColors(saved.bgColors)
      if (saved.textAligns) setTextAligns(saved.textAligns)
      if (saved.merges) setMerges(saved.merges)
      if (saved.numRows) setNumRows(saved.numRows)
      if (saved.numCols) setNumCols(saved.numCols)
      if (saved.fontFamilies) setFontFamilies(saved.fontFamilies)
      if (saved.fontSizes) setFontSizes(saved.fontSizes)
      if (saved.fontColors) setFontColors(saved.fontColors)
      if (saved.borders) setBorders(saved.borders)
    }
    setLoaded(true)
  }, [])

  // === AUTO-SAVE ===
  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => {
      saveToStorage(plan, { numRows, numCols, cells, colWidths, rowHeights, bgColors, textAligns, merges, fontFamilies, fontSizes, fontColors, borders })
      setSaveStatus('Guardado')
      setTimeout(() => setSaveStatus(''), 1500)
    }, 300)
    return () => clearTimeout(timer)
  }, [loaded, plan, numRows, numCols, cells, colWidths, rowHeights, bgColors, textAligns, merges, fontFamilies, fontSizes, fontColors, borders])

  // === RESTORE ===
  const handleRestore = () => {
    if (!confirm('Restaurar todo al diseño original? Se perderan todos los cambios.')) return
    localStorage.removeItem(STORAGE_KEY(plan))
    setCells(makeInitialCells()); setColWidths(makeInitialWidths())
    setRowHeights(makeInitialHeights(INIT_ROWS)); setBgColors(makeInitialBg(INIT_ROWS, INIT_COLS))
    setTextAligns(makeInitialAlign(INIT_ROWS, INIT_COLS)); setMerges([])
    setNumRows(INIT_ROWS); setNumCols(INIT_COLS)
    setFontFamilies(makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
    setFontSizes(makeInitialFontSizes(INIT_ROWS, INIT_COLS))
    setFontColors(makeInitialFontColors(INIT_ROWS, INIT_COLS))
    setBorders(makeInitialBorders(INIT_ROWS, INIT_COLS))
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
      updateCell(3, 7, `${data.totalStudents} Registros en la Base de Datos.`)
      const today = new Date()
      const ds = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`
      updateCell(2, 7, ds)
      updateCell(2, 20, 'IR A ' + (plan === 'vigente' ? 'PLANES DEROGADOS' : 'PLAN VIGENTE'))
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
  const [boldCells, setBoldCells] = useState<boolean[][]>(() => {
    const b = makeEmpty2D(INIT_ROWS, INIT_COLS, false)
    for (const r of [0,1,11,12,17,26,27]) for (let c = 0; c < INIT_COLS; c++) b[r][c] = true
    return b
  })
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

  return (
    <AppShell>
      <div className="overflow-auto">
        {/* TOOLBAR ROW 1 */}
        <div className="sticky top-0 z-30 bg-gray-800 text-white text-[10px] px-3 py-1.5 flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-[10px]">Plan: {plan.toUpperCase()}</span>
          <button onClick={() => {
            const np = plan==='vigente'?'derogado':'vigente'; setPlan(np)
            const s = loadFromStorage(np)
            if(s){if(s.cells)setCells(s.cells);if(s.colWidths)setColWidths(s.colWidths);if(s.rowHeights)setRowHeights(s.rowHeights);if(s.bgColors)setBgColors(s.bgColors);if(s.textAligns)setTextAligns(s.textAligns);if(s.merges)setMerges(s.merges);if(s.numRows)setNumRows(s.numRows);if(s.numCols)setNumCols(s.numCols);if(s.fontFamilies)setFontFamilies(s.fontFamilies);if(s.fontSizes)setFontSizes(s.fontSizes);if(s.fontColors)setFontColors(s.fontColors);if(s.borders)setBorders(s.borders)}
            else{setCells(makeInitialCells());setColWidths(makeInitialWidths());setRowHeights(makeInitialHeights(INIT_ROWS));setBgColors(makeInitialBg(INIT_ROWS,INIT_COLS));setTextAligns(makeInitialAlign(INIT_ROWS,INIT_COLS));setMerges([]);setNumRows(INIT_ROWS);setNumCols(INIT_COLS);setFontFamilies(makeInitialFontFamilies(INIT_ROWS,INIT_COLS));setFontSizes(makeInitialFontSizes(INIT_ROWS,INIT_COLS));setFontColors(makeInitialFontColors(INIT_ROWS,INIT_COLS));setBorders(makeInitialBorders(INIT_ROWS,INIT_COLS));setBoldCells(makeInitialBorders(INIT_ROWS,INIT_COLS).map(r=>r.map(()=>false)))}
            setSelectionStart(null);setSelectionEnd(null);setSelectedCell(null);loadCount()
          }} className="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[9px]">Cambiar Plan</button>

          <span className="text-gray-600">|</span>

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

          {saveStatus && <span className="text-green-400">{saveStatus}</span>}
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

        <table ref={tableRef} className="border-collapse" onKeyDown={handleKeyDown}
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

                  return (
                    <td key={c} data-r={r} data-c={c}
                      onClick={(e) => handleCellClick(r, c, e.shiftKey)}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      className={`p-0 relative ${selected ? 'ring-2 ring-blue-400 z-10' : ''} ${cellBorder ? 'border border-gray-400' : 'border border-transparent'}`}
                      style={{
                        backgroundColor: selected ? '#bbdefb' : (bgColors[r]?.[c] || '#ffffff'),
                        color: fontColors[r]?.[c] || '#333',
                        fontWeight: boldCells[r]?.[c] ? 'bold' : 'normal',
                        fontStyle: 'normal',
                        fontSize: `${fontSizes[r]?.[c] || 9}px`,
                        fontFamily: fontFamilies[r]?.[c] || 'Arial',
                        textAlign: textAligns[r]?.[c] || 'left',
                        verticalAlign: 'middle',
                      }}>
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
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}