'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'

const INIT_COLS = 40
const INIT_ROWS = 51

type Align = 'left' | 'center' | 'right'
interface Merge { sr: number; sc: number; er: number; ec: number }

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
  for (let r = 2; r <= 8; r++) a[r][0] = 'right'
  for (let r = 0; r < rows; r++) a[r][0] = 'center'
  for (let r = 2; r <= 8; r++) a[r][0] = 'right'
  return a
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)
  const [numRows, setNumRows] = useState(INIT_ROWS)
  const [numCols, setNumCols] = useState(INIT_COLS)

  const [cells, setCells] = useState<string[][]>(makeInitialCells)
  const [colWidths, setColWidths] = useState<number[]>(makeInitialWidths)
  const [rowHeights, setRowHeights] = useState<number[]>(() => makeInitialHeights(INIT_ROWS))
  const [bgColors, setBgColors] = useState<string[][]>(() => makeInitialBg(INIT_ROWS, INIT_COLS))
  const [textAligns, setTextAligns] = useState<Align[][]>(() => makeInitialAlign(INIT_ROWS, INIT_COLS))

  // MERGE STATE
  const [merges, setMerges] = useState<Merge[]>([])
  const [selectionStart, setSelectionStart] = useState<{r:number;c:number}|null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{r:number;c:number}|null>(null)
  const [activeCell, setActiveCell] = useState<{r:number;c:number}|null>(null)

  // Helper: grow 2D arrays
  const growCells = useCallback((prev: string[][], rows: number, cols: number) => {
    const copy = prev.map(row => [...row])
    while (copy.length < rows) { copy.push(new Array(cols).fill('')) }
    for (let r = 0; r < rows; r++) while (copy[r].length < cols) copy[r].push('')
    return copy
  }, [])

  const growBg = useCallback((prev: string[][], rows: number, cols: number) => {
    const copy = prev.map(row => [...row])
    while (copy.length < rows) { copy.push(new Array(cols).fill('#ffffff')) }
    for (let r = 0; r < rows; r++) while (copy[r].length < cols) copy[r].push('#ffffff')
    return copy
  }, [])

  const growAlign = useCallback((prev: Align[][], rows: number, cols: number) => {
    const copy = prev.map(row => [...row]) as Align[][]
    while (copy.length < rows) { copy.push(new Array(cols).fill('left') as Align[]) }
    for (let r = 0; r < rows; r++) while (copy[r].length < cols) copy[r].push('left')
    return copy
  }, [])

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
    for (const m of merges) {
      if (r === m.sr && c === m.sc) return m
    }
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
    if (shiftKey && selectionStart) {
      setSelectionEnd({ r, c })
    } else {
      setSelectionStart({ r, c })
      setSelectionEnd({ r, c })
      setSelectedCell({ r, c })
    }
  }

  // Click on row number -> select entire row
  const handleRowHeaderClick = (r: number, shiftKey: boolean) => {
    if (shiftKey && selectionStart) {
      setSelectionEnd({ r, c: numCols - 1 })
    } else {
      setSelectionStart({ r, c: 0 })
      setSelectionEnd({ r, c: numCols - 1 })
      setSelectedCell({ r, c: 0 })
    }
  }

  // Click on col header -> select entire column
  const handleColHeaderClick = (c: number, shiftKey: boolean) => {
    if (shiftKey && selectionStart) {
      setSelectionEnd({ r: numRows - 1, c })
    } else {
      setSelectionStart({ r: 0, c })
      setSelectionEnd({ r: numRows - 1, c })
      setSelectedCell({ r: 0, c })
    }
  }

  const focusInput = (r: number, c: number) => {
    const td = tableRef.current?.querySelector(`[data-r="${r}"][data-c="${c}"]`)
    if (td) {
      const input = td.querySelector('input') as HTMLInputElement
      if (input) input.focus()
    }
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
      if (nr > r) nr++; else if (nr < r) nr--
      else if (nc > c) nc++; else nc--
      nr = Math.max(0, Math.min(nr, numRows-1))
      nc = Math.max(0, Math.min(nc, numCols-1))
      tries++
    }

    setSelectedCell({ r: nr, c: nc })
    setSelectionStart({ r: nr, c: nc }); setSelectionEnd({ r: nr, c: nc })
    setTimeout(() => focusInput(nr, nc), 0)
  }

  // Selection helpers
  const selMinR = selectionStart && selectionEnd ? Math.min(selectionStart.r, selectionEnd.r) : -1
  const selMaxR = selectionStart && selectionEnd ? Math.max(selectionStart.r, selectionEnd.r) : -1
  const selMinC = selectionStart && selectionEnd ? Math.min(selectionStart.c, selectionEnd.c) : -1
  const selMaxC = selectionStart && selectionEnd ? Math.max(selectionStart.c, selectionEnd.c) : -1

  const isInSelection = (r: number, c: number) => {
    if (selMinR < 0) return false
    return r >= selMinR && r <= selMaxR && c >= selMinC && c <= selMaxC
  }

  const hasSelection = selMinR >= 0 && (selMinR !== selMaxR || selMinC !== selMaxC)

  // === MERGE ===
  const handleMerge = () => {
    if (!hasSelection) return
    const newMerge: Merge = { sr: selMinR, sc: selMinC, er: selMaxR, ec: selMaxC }
    const filtered = merges.filter(m => {
      const overlap = !(m.er < newMerge.sr || m.sr > newMerge.er || m.ec < newMerge.sc || m.sc > newMerge.ec)
      return !overlap
    })
    setMerges([...filtered, newMerge])
    setSelectionStart(null); setSelectionEnd(null)
  }

  const handleUnmerge = () => {
    if (!selectedCell) return
    setMerges(prev => prev.filter(m => !(m.sr === selectedCell.r && m.sc === selectedCell.c)))
  }

  // === ALIGNMENT ===
  const handleSetAlign = (align: Align) => {
    if (selMinR < 0) return
    setTextAligns(prev => {
      const copy = prev.map(row => [...row]) as Align[][]
      for (let r = selMinR; r <= selMaxR; r++)
        for (let c = selMinC; c <= selMaxC; c++)
          if (copy[r]) copy[r][c] = align
      return copy
    })
  }

  // === BACKGROUND COLOR ===
  const handleApplyBgToSelection = (color: string) => {
    if (selMinR < 0) return
    setBgColors(prev => {
      const copy = prev.map(row => [...row])
      for (let r = selMinR; r <= selMaxR; r++)
        for (let c = selMinC; c <= selMaxC; c++)
          if (copy[r]) copy[r][c] = color
      return copy
    })
  }

  // === INSERT ROW ===
  const handleInsertRow = (after: boolean) => {
    if (!selectedCell) return
    const at = after ? selectedCell.r + 1 : selectedCell.r
    const newRows = numRows + 1
    setCells(prev => {
      const copy = prev.map(row => [...row])
      const emptyRow = new Array(numCols).fill('')
      copy.splice(at, 0, emptyRow)
      return copy
    })
    setRowHeights(prev => {
      const copy = [...prev]
      copy.splice(at, 0, 20)
      return copy
    })
    setBgColors(prev => {
      const copy = prev.map(row => [...row])
      copy.splice(at, 0, new Array(numCols).fill('#ffffff'))
      return copy
    })
    setTextAligns(prev => {
      const copy = prev.map(row => [...row]) as Align[][]
      copy.splice(at, 0, new Array(numCols).fill('left') as Align[])
      return copy
    })
    // Adjust merges
    setMerges(prev => prev.map(m => {
      if (m.sr >= at) return { ...m, sr: m.sr + 1, er: m.er + 1 }
      if (m.er >= at) return { ...m, er: m.er + 1 }
      return m
    }))
    setNumRows(newRows)
    // Update selection
    const newStart = selectionStart && selectionStart.r >= at ? { ...selectionStart, r: selectionStart.r + 1 } : selectionStart
    const newEnd = selectionEnd && selectionEnd.r >= at ? { ...selectionEnd, r: selectionEnd.r + 1 } : selectionEnd
    setSelectionStart(newStart)
    setSelectionEnd(newEnd)
    if (selectedCell.r >= at) setSelectedCell({ ...selectedCell, r: selectedCell.r + 1 })
  }

  // === INSERT COLUMN ===
  const handleInsertCol = (after: boolean) => {
    if (!selectedCell) return
    const at = after ? selectedCell.c + 1 : selectedCell.c
    const newCols = numCols + 1
    setCells(prev => {
      const copy = prev.map(row => { const r = [...row]; r.splice(at, 0, ''); return r })
      return copy
    })
    setColWidths(prev => {
      const copy = [...prev]
      copy.splice(at, 0, 80)
      return copy
    })
    setBgColors(prev => {
      const copy = prev.map(row => { const r = [...row]; r.splice(at, 0, '#ffffff'); return r })
      return copy
    })
    setTextAligns(prev => {
      const copy = prev.map(row => { const r = [...row] as Align[]; r.splice(at, 0, 'left'); return r }) as Align[][]
      return copy
    })
    setMerges(prev => prev.map(m => {
      if (m.sc >= at) return { ...m, sc: m.sc + 1, ec: m.ec + 1 }
      if (m.ec >= at) return { ...m, ec: m.ec + 1 }
      return m
    }))
    setNumCols(newCols)
    const newStart = selectionStart && selectionStart.c >= at ? { ...selectionStart, c: selectionStart.c + 1 } : selectionStart
    const newEnd = selectionEnd && selectionEnd.c >= at ? { ...selectionEnd, c: selectionEnd.c + 1 } : selectionEnd
    setSelectionStart(newStart)
    setSelectionEnd(newEnd)
    if (selectedCell.c >= at) setSelectedCell({ ...selectedCell, c: selectedCell.c + 1 })
  }

  // === DELETE ROW ===
  const handleDeleteRow = () => {
    if (!selectedCell || numRows <= 1) return
    const at = selectedCell.r
    setCells(prev => { const copy = prev.map(row => [...row]); copy.splice(at, 1); return copy })
    setRowHeights(prev => { const copy = [...prev]; copy.splice(at, 1); return copy })
    setBgColors(prev => { const copy = prev.map(row => [...row]); copy.splice(at, 1); return copy })
    setTextAligns(prev => { const copy = prev.map(row => [...row]) as Align[][]; copy.splice(at, 1); return copy })
    setMerges(prev => prev
      .filter(m => !(m.sr <= at && m.er >= at))
      .map(m => {
        if (m.sr > at) return { ...m, sr: m.sr - 1, er: m.er - 1 }
        if (m.er > at) return { ...m, er: m.er - 1 }
        return m
      })
    )
    setNumRows(numRows - 1)
    setSelectionStart(null); setSelectionEnd(null); setSelectedCell(null)
  }

  // === DELETE COLUMN ===
  const handleDeleteCol = () => {
    if (!selectedCell || numCols <= 1) return
    const at = selectedCell.c
    setCells(prev => prev.map(row => { const r = [...row]; r.splice(at, 1); return r }))
    setColWidths(prev => { const copy = [...prev]; copy.splice(at, 1); return copy })
    setBgColors(prev => prev.map(row => { const r = [...row]; r.splice(at, 1); return r }))
    setTextAligns(prev => (prev.map(row => { const r = [...row] as Align[]; r.splice(at, 1); return r })) as Align[][])
    setMerges(prev => prev
      .filter(m => !(m.sc <= at && m.ec >= at))
      .map(m => {
        if (m.sc > at) return { ...m, sc: m.sc - 1, ec: m.ec - 1 }
        if (m.ec > at) return { ...m, ec: m.ec - 1 }
        return m
      })
    )
    setNumCols(numCols - 1)
    setSelectionStart(null); setSelectionEnd(null); setSelectedCell(null)
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

    // Swap full rows in all arrays
    setCells(prev => {
      const copy = prev.map(row => [...row])
      const block = copy.splice(fromR, count)
      const neighbor = copy.splice(swapWith, 1)
      if (dir === 'up') { copy.splice(swapWith, 0, ...block); copy.splice(swapWith + count, 0, ...neighbor) }
      else { copy.splice(fromR, 0, ...neighbor); copy.splice(fromR + 1, 0, ...block) }
      return copy
    })
    setRowHeights(prev => {
      const copy = [...prev]
      const block = copy.splice(fromR, count)
      const neighbor = copy.splice(swapWith, 1)
      if (dir === 'up') { copy.splice(swapWith, 0, ...block); copy.splice(swapWith + count, 0, ...neighbor) }
      else { copy.splice(fromR, 0, ...neighbor); copy.splice(fromR + 1, 0, ...block) }
      return copy
    })
    setBgColors(prev => {
      const copy = prev.map(row => [...row])
      const block = copy.splice(fromR, count)
      const neighbor = copy.splice(swapWith, 1)
      if (dir === 'up') { copy.splice(swapWith, 0, ...block); copy.splice(swapWith + count, 0, ...neighbor) }
      else { copy.splice(fromR, 0, ...neighbor); copy.splice(fromR + 1, 0, ...block) }
      return copy
    })
    setTextAligns(prev => {
      const copy = prev.map(row => [...row]) as Align[][]
      const block = copy.splice(fromR, count)
      const neighbor = copy.splice(swapWith, 1)
      if (dir === 'up') { copy.splice(swapWith, 0, ...block); copy.splice(swapWith + count, 0, ...neighbor) }
      else { copy.splice(fromR, 0, ...neighbor); copy.splice(fromR + 1, 0, ...block) }
      return copy
    })
    // Adjust merges: swap row indices
    setMerges(prev => prev.map(m => {
      let { sr, er, sc, ec } = m
      if (sr >= fromR && er <= toR) {
        // Merge inside moving block
        sr += (dir === 'up' ? -1 : 1); er += (dir === 'up' ? -1 : 1)
      } else if (sr === swapWith) {
        // Merge in neighbor row
        sr = dir === 'up' ? toR : fromR; er = sr
      } else {
        // Merge outside both blocks - no change needed
      }
      return { sr, er, sc, ec }
    }))

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

    setCells(prev => prev.map(row => {
      const r = [...row]
      const block = r.splice(fromC, count)
      const neighbor = r.splice(swapWith, 1)
      if (dir === 'left') { r.splice(swapWith, 0, ...block); r.splice(swapWith + count, 0, ...neighbor) }
      else { r.splice(fromC, 0, ...neighbor); r.splice(fromC + 1, 0, ...block) }
      return r
    }))
    setColWidths(prev => {
      const r = [...prev]
      const block = r.splice(fromC, count)
      const neighbor = r.splice(swapWith, 1)
      if (dir === 'left') { r.splice(swapWith, 0, ...block); r.splice(swapWith + count, 0, ...neighbor) }
      else { r.splice(fromC, 0, ...neighbor); r.splice(fromC + 1, 0, ...block) }
      return r
    })
    setBgColors(prev => prev.map(row => {
      const r = [...row]
      const block = r.splice(fromC, count)
      const neighbor = r.splice(swapWith, 1)
      if (dir === 'left') { r.splice(swapWith, 0, ...block); r.splice(swapWith + count, 0, ...neighbor) }
      else { r.splice(fromC, 0, ...neighbor); r.splice(fromC + 1, 0, ...block) }
      return r
    }))
    setTextAligns(prev => (prev.map(row => {
      const r = [...row] as Align[]
      const block = r.splice(fromC, count)
      const neighbor = r.splice(swapWith, 1)
      if (dir === 'left') { r.splice(swapWith, 0, ...block); r.splice(swapWith + count, 0, ...neighbor) }
      else { r.splice(fromC, 0, ...neighbor); r.splice(fromC + 1, 0, ...block) }
      return r
    })) as Align[][])
    setMerges(prev => prev.map(m => {
      let { sr, er, sc, ec } = m
      if (sc >= fromC && ec <= toC) {
        sc += (dir === 'left' ? -1 : 1); ec += (dir === 'left' ? -1 : 1)
      } else if (sc === swapWith) {
        sc = dir === 'left' ? toC : fromC; ec = sc
      }
      return { sr, er, sc, ec }
    }))

    const off = dir === 'left' ? -1 : 1
    setSelectionStart({ r: selMinR >= 0 ? selMinR : 0, c: fromC + off })
    setSelectionEnd({ r: selMaxR >= 0 ? selMaxR : numRows - 1, c: toC + off })
    setSelectedCell({ r: selectedCell.r, c: fromC + off })
  }

  // Input handlers
  const handleInputBlur = (r: number, c: number, value: string) => {
    updateCell(r, c, value)
    setActiveCell(null)
  }

  const navigateTo = (r: number, c: number) => {
    let nr = r, nc = c
    let tries = 0
    while (isHidden(nr, nc) && tries < 500) {
      if (nr > r) nr++; else if (nr < r) nr--
      else if (nc > c) nc++; else nc--
      nr = Math.max(0, Math.min(nr, numRows-1))
      nc = Math.max(0, Math.min(nc, numCols-1))
      tries++
    }
    setSelectedCell({ r: nr, c: nc })
    setSelectionStart({ r: nr, c: nc }); setSelectionEnd({ r: nr, c: nc })
    setTimeout(() => focusInput(nr, nc), 0)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); e.stopPropagation()
      updateCell(r, c, e.currentTarget.value)
      navigateTo(r + 1, c)
    } else if (e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation()
      updateCell(r, c, e.currentTarget.value)
      navigateTo(r, e.shiftKey ? c - 1 : c + 1)
    } else if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)) {
      updateCell(r, c, e.currentTarget.value)
    }
  }

  const getFontColor = (r: number) => {
    if (r === 0) return 'white'
    if ([1,12,17,26].includes(r)) return '#003366'
    return '#333'
  }
  const isBoldRow = (r: number) => [0,1,11,12,17,26,27].includes(r)

  // Check if entire row is selected
  const isFullRowSelected = hasSelection && selMinC === 0 && selMaxC === numCols - 1
  const isFullColSelected = hasSelection && selMinR === 0 && selMaxR === numRows - 1

  return (
    <AppShell>
      <div className="overflow-auto">
        {/* Toolbar Row 1 - Main actions */}
        <div className="sticky top-0 z-30 bg-gray-800 text-white text-[10px] px-3 py-1.5 flex flex-wrap items-center gap-2">
          <span className="font-bold text-[10px]">Plan: {plan.toUpperCase()}</span>
          <button onClick={() => { setPlan(p => p === 'vigente' ? 'derogado' : 'vigente'); loadCount() }}
            className="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[9px]">Cambiar Plan</button>

          <span className="text-gray-600">|</span>

          {/* Alignment buttons */}
          <button onClick={() => handleSetAlign('left')} title="Alinear izquierda"
            className="bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-[9px] border border-gray-500">
            <span style={{display:'inline-block',textAlign:'left',width:'14px'}}>▾</span> Izq
          </button>
          <button onClick={() => handleSetAlign('center')} title="Centrar"
            className="bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-[9px] border border-gray-500">
            <span style={{display:'inline-block',textAlign:'center',width:'14px'}}>▾</span> Ctr
          </button>
          <button onClick={() => handleSetAlign('right')} title="Alinear derecha"
            className="bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-[9px] border border-gray-500">
            <span style={{display:'inline-block',textAlign:'right',width:'14px'}}>▾</span> Der
          </button>

          <span className="text-gray-600">|</span>

          {/* Merge */}
          <button onClick={handleMerge} disabled={!hasSelection}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">
            Combinar
          </button>
          <button onClick={handleUnmerge} disabled={!selectedCell || !getMerge(selectedCell.r, selectedCell.c)}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">
            Descomb.
          </button>

          <span className="text-gray-600">|</span>

          {/* Insert/Delete Row/Col */}
          <button onClick={() => handleInsertRow(false)} disabled={!selectedCell}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Insertar fila arriba">
            +Fila
          </button>
          <button onClick={() => handleInsertRow(true)} disabled={!selectedCell}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Insertar fila abajo">
            +Fila Abajo
          </button>
          <button onClick={() => handleInsertCol(false)} disabled={!selectedCell}
            className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Insertar columna izquierda">
            +Col
          </button>
          <button onClick={() => handleInsertCol(true)} disabled={!selectedCell}
            className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Insertar columna derecha">
            +Col Der
          </button>
          <button onClick={handleDeleteRow} disabled={!selectedCell || numRows <= 1}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Eliminar fila">
            -Fila
          </button>
          <button onClick={handleDeleteCol} disabled={!selectedCell || numCols <= 1}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Eliminar columna">
            -Col
          </button>

          <span className="text-gray-600">|</span>

          {/* Move Row/Col */}
          <button onClick={() => handleMoveRow('up')} disabled={!selectedCell || selMinR === 0}
            className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Mover fila(s) arriba">
            Fila ↑
          </button>
          <button onClick={() => handleMoveRow('down')} disabled={!selectedCell || selMaxR >= numRows-1}
            className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Mover fila(s) abajo">
            Fila ↓
          </button>
          <button onClick={() => handleMoveCol('left')} disabled={!selectedCell || selMinC === 0}
            className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Mover columna(s) izquierda">
            Col ←
          </button>
          <button onClick={() => handleMoveCol('right')} disabled={!selectedCell || selMaxC >= numCols-1}
            className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]" title="Mover columna(s) derecha">
            Col →
          </button>

          <span className="text-gray-600">|</span>

          {hasSelection && (
            <span className="text-yellow-300">
              {colLetter(selMinC)}{selMinR+1}:{colLetter(selMaxC)}{selMaxR+1}
              ({selMaxR-selMinR+1}f x {selMaxC-selMinC+1}c)
              {isFullRowSelected && <span className="text-green-300 ml-1">[FILA COMPLETA]</span>}
              {isFullColSelected && <span className="text-green-300 ml-1">[COLUMNA COMPLETA]</span>}
            </span>
          )}

          <span className="text-gray-400 ml-auto">{numRows}f x {numCols}c</span>
        </div>

        {/* Toolbar Row 2 - Cell properties */}
        {selectedCell && (
          <div className="sticky top-7 z-30 bg-gray-700 text-white text-[10px] px-3 py-1 flex flex-wrap items-center gap-2">
            Celda: <b>{colLetter(selectedCell.c)}{selectedCell.r+1}</b>
            <span className="text-gray-500">|</span>
            Ancho: <input type="number" value={colWidths[selectedCell.c] || 80}
              onChange={e => { const w=[...colWidths]; w[selectedCell.c]=parseInt(e.target.value)||40; setColWidths(w) }}
              className="w-14 bg-gray-600 text-white text-[9px] px-1 rounded text-center" />px
            Alto: <input type="number" value={rowHeights[selectedCell.r] || 20}
              onChange={e => { const h=[...rowHeights]; h[selectedCell.r]=parseInt(e.target.value)||20; setRowHeights(h) }}
              className="w-14 bg-gray-600 text-white text-[9px] px-1 rounded text-center" />px
            <span className="text-gray-500">|</span>
            Alineacion: {textAligns[selectedCell.r]?.[selectedCell.c] || 'left'}
            <span className="text-gray-500">|</span>
            Fondo: <input type="color" value={bgColors[selectedCell.r]?.[selectedCell.c] || '#ffffff'}
              onChange={e => { updateBg(selectedCell.r, selectedCell.c, e.target.value); handleApplyBgToSelection(e.target.value) }}
              className="w-6 h-4 cursor-pointer" />
            {hasSelection && <span className="text-[8px] text-gray-400">(se aplica a toda la seleccion)</span>}
          </div>
        )}

        <table ref={tableRef} className="border-collapse" onKeyDown={handleKeyDown}
          style={{ marginTop: selectedCell ? '52px' : '28px' }}>
          <colgroup>
            <col style={{ width: '35px' }} />
            {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
          </colgroup>
          <tbody>
            {/* Column headers */}
            <tr>
              <td className="border border-gray-400 bg-gray-300 text-[8px] text-center text-gray-600 sticky left-0 z-20"
                style={{ top: selectedCell ? '52px' : '28px' }}></td>
              {Array.from({ length: numCols }).map((_, c) => {
                const colSel = selMinC <= c && c <= selMaxC && selMinR === 0 && selMaxR === numRows - 1
                return (
                  <td key={c}
                    onClick={(e) => handleColHeaderClick(c, e.shiftKey)}
                    className={`border border-gray-400 text-[8px] text-center font-mono cursor-pointer select-none
                      ${colSel ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                    style={{ top: selectedCell ? '52px' : '28px', position: 'sticky', zIndex: 15 }}>
                    {colLetter(c)}
                  </td>
                )
              })}
            </tr>

            {/* Data rows */}
            {Array.from({ length: numRows }).map((_, r) => (
              <tr key={r} style={{ height: `${rowHeights[r] || 20}px` }}>
                <td
                  onClick={(e) => handleRowHeaderClick(r, e.shiftKey)}
                  className={`border border-gray-400 text-[8px] text-center cursor-pointer select-none sticky left-0 z-5
                    ${selMinR <= r && r <= selMaxR && selMinC === 0 && selMaxC === numCols - 1 ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                  {r + 1}
                </td>
                {Array.from({ length: numCols }).map((_, c) => {
                  if (isHidden(r, c)) return null

                  const merge = getMerge(r, c)
                  const colSpan = merge ? (merge.ec - merge.sc + 1) : 1
                  const rowSpan = merge ? (merge.er - merge.sr + 1) : 1
                  const selected = isInSelection(r, c)

                  return (
                    <td
                      key={c}
                      data-r={r}
                      data-c={c}
                      onClick={(e) => handleCellClick(r, c, e.shiftKey)}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      className={`border text-[9px] p-0 relative
                        ${selected ? 'ring-2 ring-blue-400 z-10' : ''}
                        border-gray-400`}
                      style={{
                        backgroundColor: selected ? '#bbdefb' : (bgColors[r]?.[c] || '#ffffff'),
                        color: getFontColor(r),
                        fontWeight: isBoldRow(r) ? 'bold' : 'normal',
                        textAlign: textAligns[r]?.[c] || 'left',
                        verticalAlign: 'middle',
                      }}
                    >
                      <input
                        type="text"
                        defaultValue={cells[r]?.[c] || ''}
                        onBlur={(e) => handleInputBlur(r, c, e.target.value)}
                        onFocus={() => { setActiveCell({r,c}); setSelectedCell({r,c}); setSelectionStart({r,c}); setSelectionEnd({r,c}) }}
                        onKeyDown={(e) => handleInputKeyDown(e, r, c)}
                        className="w-full h-full bg-transparent border-0 outline-none text-[9px] p-0 px-0.5"
                        style={{
                          color: 'inherit',
                          fontWeight: 'inherit',
                          textAlign: 'inherit',
                          minHeight: `${rowHeights[r] || 20}px`,
                          lineHeight: `${rowHeights[r] || 20}px`,
                        }}
                      />
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