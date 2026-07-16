'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'

const INIT_COLS = 16
const INIT_ROWS = 85

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

  // ROW 0: Título principal
  c[0][0] = 'INGRESAR DATOS, NOTAS Y OBSERVACIONES PARA CERTIFICACION DE CALIFICACIONES EMG 31059 - CONSTANCIA - BOLETIN - VALIDACION DE TITULO Y NOTAS'

  // ROW 1: DATOS PERSONALES + CIRCULAR
  c[1][0] = 'DATOS PERSONALES'
  c[1][8] = 'CIRCULAR N° 05, (02/07/2003) (modificada al 30/03/2007)'

  // ROWS 2-8: Datos personales
  c[2][1] = 'CEDULA:'; c[2][3] = '*'
  c[3][1] = 'FECHA DE NACIMIENTO:'; c[3][3] = '*'
  c[4][1] = 'APELLIDOS:'; c[4][3] = '*'
  c[5][1] = 'NOMBRES:'; c[5][3] = '*'
  c[6][1] = 'PAIS DE NACIMIENTO:'; c[6][3] = 'VENEZUELA'
  c[7][1] = 'ESTADO:'; c[7][3] = '*'
  c[8][1] = 'MUNICIPIO:'; c[8][3] = '*'

  // ROW 9: Programación + Sección
  c[9][1] = 'Programación y Diseño por Juan C. Orellana R.'
  c[9][5] = 'SECCION = SS (otro Plantel)'

  // ROW 10: Info y botones fila 1
  c[10][7] = 'Cambio de fecha de expedición del documento.'
  c[10][10] = '<Cambiar Apellidos, Nombres de Dir.'
  c[10][11] = '<Cambiar Cédula de Dir.'
  c[10][13] = 'Impresora'
  c[10][14] = 'Wondershare PDF'
  c[10][15] = 'IR A PLANES DEROGADOS'

  // ROW 11: Botones fila 2
  c[11][6] = 'Buscar/Edit Alumno'
  c[11][9] = 'EXPORTAR BASE DE DATOS'
  c[11][12] = 'Guardar Datos'
  c[11][13] = 'Guardar Editado'
  c[11][14] = 'Eliminar Datos'

  // ROW 12: Separador vacío

  // ROW 13: Encabezado tabla plantel
  c[13][0] = 'N°'; c[13][1] = 'NOMBRE DEL PLANTEL'; c[13][2] = 'LOCALIDAD'; c[13][3] = 'E.F.'

  // ROWS 14-18: Datos plantel (5 filas)
  for (let i = 0; i < 5; i++) {
    c[14 + i][0] = String(i + 1)
    c[14 + i][1] = '*****'
    c[14 + i][2] = '***'
    c[14 + i][3] = '**'
  }

  // === PRIMER AÑO (filas 19-26) ===
  c[19][1] = 'PRIMER AÑO'; c[19][2] = 'SECCION'
  c[19][3] = 'AREAS DE FORMACION'; c[19][4] = 'NOTA'; c[19][5] = 'T-E'; c[19][6] = 'FECHA'; c[19][7] = 'PLANTEL'
  const primer = ['Castellano', 'Inglés y otras Len. Extranj.', 'Matemáticas', 'Educación Física', 'Arte y Patrimonio', 'Ciencias Naturales', 'Geografía, Hist. y Ciudad.']
  for (let i = 0; i < primer.length; i++) {
    c[20 + i][3] = primer[i]; c[20 + i][4] = '**'; c[20 + i][5] = '**'; c[20 + i][6] = '**'; c[20 + i][7] = '***'
  }

  // === SEGUNDO AÑO (filas 27-34) ===
  c[27][1] = 'SEGUNDO AÑO'; c[27][2] = 'SECCION'
  c[27][3] = 'AREAS DE FORMACION'; c[27][4] = 'NOTA'; c[27][5] = 'T-E'; c[27][6] = 'FECHA'; c[27][7] = 'PLANTEL'
  const segundo = ['Castellano', 'Inglés y otras Len. Extranj.', 'Matemáticas', 'Educación Física', 'Arte y Patrimonio', 'Ciencias Naturales', 'Geografía, Hist. y Ciudad.']
  for (let i = 0; i < segundo.length; i++) {
    c[28 + i][3] = segundo[i]; c[28 + i][4] = '**'; c[28 + i][5] = '**'; c[28 + i][6] = '**'; c[28 + i][7] = '***'
  }

  // === TABLA OC/PG (filas 35-40, lado derecho) ===
  c[35][9] = 'AREAS DE FORMACION'; c[35][10] = 'OC'; c[35][11] = 'PG'
  for (let i = 0; i < 5; i++) {
    c[36 + i][9] = `${i + 1}°`; c[36 + i][10] = '*'; c[36 + i][11] = `${i + 1}°`
  }

  // === TERCER AÑO (filas 41-49) ===
  c[41][1] = 'TERCER AÑO'; c[41][2] = 'SECCION'
  c[41][3] = 'AREAS DE FORMACION'; c[41][4] = 'NOTA'; c[41][5] = 'T-E'; c[41][6] = 'FECHA'
  const tercero = ['Castellano', 'Inglés y otras Len. Extranj.', 'Matemáticas', 'Educación Física', 'Física', 'Química', 'Biología', 'Geografía, Hist. y Ciudad.']
  for (let i = 0; i < tercero.length; i++) {
    c[42 + i][3] = tercero[i]; c[42 + i][4] = '**'; c[42 + i][5] = '**'; c[42 + i][6] = '***'
  }

  // === CUARTO AÑO (filas 50-59) ===
  c[50][1] = 'CUARTO AÑO'; c[50][2] = 'SECCION'
  c[50][3] = 'AREAS DE FORMACION'; c[50][4] = 'NOTA'; c[50][5] = 'T-E'; c[50][6] = 'FECHA'
  const cuarto = ['Castellano', 'Inglés y otras Len. Extranj.', 'Matemáticas', 'Educación Física', 'Física', 'Química', 'Biología', 'Geografía, Hist. y Ciudad.', 'Form. para la Sober. Nal.']
  for (let i = 0; i < cuarto.length; i++) {
    c[51 + i][3] = cuarto[i]; c[51 + i][4] = '**'; c[51 + i][5] = '**'; c[51 + i][6] = '***'
  }

  // === QUINTO AÑO (filas 60-70) ===
  c[60][1] = 'QUINTO AÑO'; c[60][2] = 'SECCION'
  c[60][3] = 'AREAS DE FORMACION'; c[60][4] = 'NOTA'; c[60][5] = 'T-E'; c[60][6] = 'FECHA'
  const quinto = ['Castellano', 'Inglés y otras Len. Extranj.', 'Matemáticas', 'Educación Física', 'Física', 'Química', 'Biología', 'Ciencias de la Tierra', 'Geografía, Hist. y Ciudad.', 'Form. para la Sober. Nal.']
  for (let i = 0; i < quinto.length; i++) {
    c[61 + i][3] = quinto[i]; c[61 + i][4] = '**'; c[61 + i][5] = '**'; c[61 + i][6] = '***'
  }

  // === TABLA GRUPO (filas 71-75, lado derecho) ===
  c[71][9] = 'GRUPO'
  c[72][9] = '1°'; c[72][10] = '*'; c[72][11] = '2°'
  c[73][9] = '3°'; c[73][10] = '*'; c[73][11] = '3°'
  c[74][9] = '4°'; c[74][10] = '*'; c[74][11] = '4°'
  c[75][9] = '5°'; c[75][10] = '*'; c[75][11] = '5°'

  // === VALIDACION TITULO / NOTAS (filas 76-80) ===
  c[76][9] = 'VALIDACION TITULO / NOTAS'
  c[77][9] = 'Serial T.'
  c[78][9] = 'Fecha Emisión T.'; c[78][10] = 'Año Egreso T.'
  c[79][9] = 'Fecha Emisión N.'
  c[80][9] = 'Promedio Total'; c[80][10] = '*'

  // === OBSERVACIONES (filas 81-83) ===
  c[81][1] = 'Observaciones:'
  c[81][2] = 'APLICACIÓN DEL PROCESO DE CONVERSIÓN Y TRANSFERENCIA DE ESTUDIOS DE ACUERDO AL MEMO-'
  c[82][1] = 'RANDUM DE FECHA 17/11/2017.'
  c[83][6] = '< 1 CARACTERES RESTANTES'
  c[83][7] = '< 77 CARACTERES RESTANTES'
  c[83][8] = '< 103 CARACTERES RESTANTES'
  c[83][9] = '< 103 CARACTERES RESTANTES'
  c[83][10] = 'OBSERVACIONES PARA CERTIFICACION'

  // === BOTONES NAVEGACIÓN (fila 84) ===
  c[84][0] = 'EMG 31059'; c[84][1] = 'CONSTANCIA DE NOTAS'; c[84][2] = 'VALIDAR NOTAS'
  c[84][3] = 'VALIDAR TITULO'; c[84][4] = 'BOLETIN'; c[84][5] = 'TITULO'
  c[84][6] = 'AGREGAR DATOS'; c[84][7] = 'CE'; c[84][8] = 'ALUMNOS'
  c[84][9] = 'BOLETAS'; c[84][10] = 'TITULOS'

  return c
}

function makeInitialWidths(): number[] {
  return [30, 180, 80, 150, 50, 40, 90, 110, 20, 150, 50, 50, 50, 50, 50, 50]
}

function makeInitialHeights(rows: number): number[] {
  const h: number[] = []
  for (let r = 0; r < rows; r++) {
    if (r === 0) h[r] = 30
    else if (r === 1) h[r] = 25
    else if (r >= 2 && r <= 9) h[r] = 22
    else if (r >= 10 && r <= 11) h[r] = 28
    else if (r === 12) h[r] = 10
    else if (r === 13) h[r] = 22
    else if (r >= 14 && r <= 18) h[r] = 20
    else if ([19, 27, 35, 41, 50, 60, 71, 76].includes(r)) h[r] = 22
    else h[r] = 20
  }
  return h
}

function makeInitialBg(rows: number, cols: number): string[][] {
  const b = makeEmpty2D(rows, cols, '#ffffff')
  const headerRows = [1, 13, 19, 27, 35, 41, 50, 60, 71, 76]
  const dataRanges: [number, number][] = [
    [2, 8], [14, 18], [20, 26], [28, 34], [36, 40],
    [42, 49], [51, 59], [61, 70], [72, 75], [77, 80], [81, 83]
  ]
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === 0) b[r][c] = '#0080ff'
    else if (headerRows.includes(r)) b[r][c] = '#b3d9ff'
    else if (r === 9) b[r][c] = '#ffffcc'
    else if (r >= 10 && r <= 11) b[r][c] = '#f0f0f0'
    else if (dataRanges.some(([s, e]) => r >= s && r <= e)) b[r][c] = '#ffffcc'
    else if (r === 84) b[r][c] = '#e8e8e8'
  }
  return b
}

function makeInitialAlign(rows: number, cols: number): Align[][] {
  const a = makeEmpty2D<Align>(rows, cols, 'left')
  const centerRows = [0, 1, 13, 19, 27, 35, 41, 50, 60, 71, 76, 84]
  for (let r = 0; r < rows; r++) {
    if (centerRows.includes(r)) { for (let c = 0; c < cols; c++) a[r][c] = 'center' }
    a[r][0] = 'center'
    if ([4, 5, 10, 11].includes(r) || r >= 36) { a[r][10] = 'center'; a[r][11] = 'center' }
  }
  for (let r = 2; r <= 8; r++) a[r][1] = 'right'
  for (let r = 19; r <= 70; r++) { a[r][4] = 'center'; a[r][5] = 'center' }
  return a
}

function makeInitialFontFamilies(rows: number, cols: number): string[][] {
  return makeEmpty2D(rows, cols, 'Arial')
}

function makeInitialFontSizes(rows: number, cols: number): number[][] {
  const s = makeEmpty2D(rows, cols, 9)
  for (let c = 0; c < cols; c++) { s[0][c] = 10; s[1][c] = 10 }
  return s
}

function makeInitialFontColors(rows: number, cols: number): string[][] {
  const fc = makeEmpty2D(rows, cols, '#333333')
  const darkBlueRows = [1, 13, 19, 27, 35, 41, 50, 60, 71, 76]
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === 0) fc[r][c] = '#ffffff'
    else if (darkBlueRows.includes(r)) fc[r][c] = '#003366'
  }
  return fc
}

function makeInitialBorders(rows: number, cols: number): boolean[][] {
  return makeEmpty2D(rows, cols, true)
}

function makeInitialBold(rows: number, cols: number): boolean[][] {
  const b = makeEmpty2D(rows, cols, false)
  const boldRows = [0, 1, 13, 19, 27, 35, 41, 50, 60, 71, 76]
  for (const r of boldRows) for (let c = 0; c < cols; c++) b[r][c] = true
  b[81][1] = true
  for (let c = 0; c <= 10; c++) b[84][c] = true
  return b
}

function makeInitialMerges(): Merge[] {
  return [
    // Título principal (toda la fila)
    { sr: 0, sc: 0, er: 0, ec: 15 },
    // DATOS PERSONALES + CIRCULAR
    { sr: 1, sc: 0, er: 1, ec: 7 },
    { sr: 1, sc: 8, er: 1, ec: 15 },
    // PRIMER AÑO - etiqueta y sección (fusionadas verticalmente)
    { sr: 19, sc: 1, er: 26, ec: 1 },
    { sr: 19, sc: 2, er: 26, ec: 2 },
    // SEGUNDO AÑO
    { sr: 27, sc: 1, er: 34, ec: 1 },
    { sr: 27, sc: 2, er: 34, ec: 2 },
    // OC/PG - encabezados fusionados verticalmente
    { sr: 35, sc: 9, er: 40, ec: 9 },
    { sr: 35, sc: 10, er: 40, ec: 10 },
    { sr: 35, sc: 11, er: 40, ec: 11 },
    // TERCER AÑO
    { sr: 41, sc: 1, er: 49, ec: 1 },
    { sr: 41, sc: 2, er: 49, ec: 2 },
    // CUARTO AÑO
    { sr: 50, sc: 1, er: 59, ec: 1 },
    { sr: 50, sc: 2, er: 59, ec: 2 },
    // QUINTO AÑO
    { sr: 60, sc: 1, er: 70, ec: 1 },
    { sr: 60, sc: 2, er: 70, ec: 2 },
    // GRUPO - encabezado fusionado verticalmente
    { sr: 71, sc: 9, er: 75, ec: 9 },
    // VALIDACION TITULO / NOTAS - etiqueta fusionada verticalmente
    { sr: 76, sc: 9, er: 80, ec: 9 },
    // Observaciones - texto fusionado horizontalmente
    { sr: 81, sc: 2, er: 83, ec: 15 },
  ]
}

// localStorage persistence
const STORAGE_KEY = (plan: string) => `jo-sigae-dash-v2-${plan}`

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
    const parsed = JSON.parse(raw) as SheetState
    if (parsed.numCols !== INIT_COLS || parsed.numRows !== INIT_ROWS) return null
    return parsed
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

  const [merges, setMerges] = useState<Merge[]>(makeInitialMerges)
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
    if (!confirm('Restaurar todo al diseño original? Se perderán todos los cambios.')) return
    localStorage.removeItem(STORAGE_KEY(plan))
    setCells(makeInitialCells()); setColWidths(makeInitialWidths())
    setRowHeights(makeInitialHeights(INIT_ROWS)); setBgColors(makeInitialBg(INIT_ROWS, INIT_COLS))
    setTextAligns(makeInitialAlign(INIT_ROWS, INIT_COLS)); setMerges(makeInitialMerges())
    setNumRows(INIT_ROWS); setNumCols(INIT_COLS)
    setFontFamilies(makeInitialFontFamilies(INIT_ROWS, INIT_COLS))
    setFontSizes(makeInitialFontSizes(INIT_ROWS, INIT_COLS))
    setFontColors(makeInitialFontColors(INIT_ROWS, INIT_COLS))
    setBorders(makeInitialBorders(INIT_ROWS, INIT_COLS))
    setBoldCells(makeInitialBold(INIT_ROWS, INIT_COLS))
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
      updateCell(10, 9, `${data.totalStudents} Registros en la Base de Datos.`)
      const today = new Date()
      const ds = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`
      updateCell(10, 6, ds)
      updateCell(10, 15, 'IR A ' + (plan === 'vigente' ? 'PLANES DEROGADOS' : 'PLAN VIGENTE'))
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
  const [boldCells, setBoldCells] = useState<boolean[][]>(() => makeInitialBold(INIT_ROWS, INIT_COLS))
  const handleToggleBold = () => {
    if (!selectedCell) return
    const current = boldCells[selectedCell.r]?.[selectedCell.c] ?? false
    applyToSelection(boldCells, !current, setBoldCells)
  }

  // === INSERT ROW ===
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
    setBorders(prev => { const c=prev.map(r=>[...r]); c.splice(at,0,new Array(numCols).fill(true)); return c })
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
    setFontColors(ins(fontColors, '#333333')); setBorders(ins(borders, true))
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
            else{setCells(makeInitialCells());setColWidths(makeInitialWidths());setRowHeights(makeInitialHeights(INIT_ROWS));setBgColors(makeInitialBg(INIT_ROWS,INIT_COLS));setTextAligns(makeInitialAlign(INIT_ROWS,INIT_COLS));setMerges(makeInitialMerges());setNumRows(INIT_ROWS);setNumCols(INIT_COLS);setFontFamilies(makeInitialFontFamilies(INIT_ROWS,INIT_COLS));setFontSizes(makeInitialFontSizes(INIT_ROWS,INIT_COLS));setFontColors(makeInitialFontColors(INIT_ROWS,INIT_COLS));setBorders(makeInitialBorders(INIT_ROWS,INIT_COLS));setBoldCells(makeInitialBold(INIT_ROWS,INIT_COLS))}
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