'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'

const COLS = 40
const ROWS = 51

interface Merge { sr: number; sc: number; er: number; ec: number }

function makeInitialCells(): string[][] {
  const c: string[][] = []
  for (let r = 0; r < ROWS; r++) { c[r] = []; for (let col = 0; col < COLS; col++) c[r][col] = '' }
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
  while (w.length < COLS) w.push(80)
  return w
}

function makeInitialHeights(): number[] {
  const h: number[] = []
  for (let r = 0; r < ROWS; r++) h[r] = r <= 1 ? 28 : r <= 11 ? 22 : 20
  return h
}

function makeInitialBg(): string[][] {
  const b: string[][] = []
  for (let r = 0; r < ROWS; r++) { b[r] = []; for (let c = 0; c < COLS; c++) {
    if (r===0) b[r][c]='#0080ff'; else if (r===1) b[r][c]='#b3d9ff'; else if (r>=2&&r<=11) b[r][c]='#ffffcc'
    else if (r===12||r===17) b[r][c]='#b3d9ff'; else if (r>=13&&r<=25) b[r][c]='#ffffcc'
    else if (r===26) b[r][c]='#b3d9ff'; else if (r===27) b[r][c]='#ffffcc'; else b[r][c]='#ffffff'
  }}
  return b
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)

  const [cells, setCells] = useState<string[][]>(makeInitialCells)
  const [colWidths, setColWidths] = useState<number[]>(makeInitialWidths)
  const [rowHeights, setRowHeights] = useState<number[]>(makeInitialHeights)
  const [bgColors, setBgColors] = useState<string[][]>(makeInitialBg)

  // MERGE STATE
  const [merges, setMerges] = useState<Merge[]>([])
  const [selectionStart, setSelectionStart] = useState<{r:number;c:number}|null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{r:number;c:number}|null>(null)

  // Which cell input is currently focused (for blur save)
  const [activeCell, setActiveCell] = useState<{r:number;c:number}|null>(null)

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
    setCells(prev => { const copy = prev.map(row => [...row]); copy[r][c] = val; return copy })
  }, [])

  const updateBg = useCallback((r: number, c: number, color: string) => {
    setBgColors(prev => { const copy = prev.map(row => [...row]); copy[r][c] = color; return copy })
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

  // Focus the input inside a cell
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
    if (e.key === 'ArrowDown') { e.preventDefault(); nr = Math.min(r+1, ROWS-1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nr = Math.max(r-1, 0) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nc = Math.min(c+1, COLS-1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); nc = Math.max(c-1, 0) }
    else if (e.key === 'Tab') { e.preventDefault(); nr = r; nc = e.shiftKey ? Math.max(c-1,0) : Math.min(c+1, COLS-1) }
    else if (e.key === 'Enter') { e.preventDefault(); nr = Math.min(r+1, ROWS-1); nc = c }
    else return

    // Skip hidden cells
    let tries = 0
    while (isHidden(nr, nc) && tries < 200) {
      if (nr > r) nr++; else if (nr < r) nr--;
      else if (nc > c) nc++; else nc--
      if (nr < 0) { nr = 0; nc = Math.max(nc-1, 0) }
      if (nr >= ROWS) { nr = ROWS-1; nc = Math.min(nc+1, COLS-1) }
      if (nc < 0) { nc = 0; nr = Math.max(nr-1, 0) }
      if (nc >= COLS) { nc = COLS-1; nr = Math.min(nr+1, ROWS-1) }
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

  const handleApplyBgToSelection = (color: string) => {
    if (selMinR < 0) return
    setBgColors(prev => {
      const copy = prev.map(row => [...row])
      for (let r = selMinR; r <= selMaxR; r++)
        for (let c = selMinC; c <= selMaxC; c++)
          copy[r][c] = color
      return copy
    })
  }

  // Save cell value on blur
  const handleInputBlur = (r: number, c: number, value: string) => {
    updateCell(r, c, value)
    setActiveCell(null)
  }

  // Save on Enter and move down
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      const input = e.currentTarget
      updateCell(r, c, input.value)
      // Move down
      let nr = Math.min(r+1, ROWS-1)
      let nc = c
      let tries = 0
      while (isHidden(nr, nc) && tries < 200) {
        nr = Math.min(nr+1, ROWS-1)
        tries++
      }
      setSelectedCell({ r: nr, c: nc })
      setSelectionStart({ r: nr, c: nc }); setSelectionEnd({ r: nr, c: nc })
      setTimeout(() => focusInput(nr, nc), 0)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      const input = e.currentTarget
      updateCell(r, c, input.value)
      let nc = e.shiftKey ? Math.max(c-1, 0) : Math.min(c+1, COLS-1)
      let nr = r
      let tries = 0
      while (isHidden(nr, nc) && tries < 200) {
        nc = e.shiftKey ? Math.max(nc-1, 0) : Math.min(nc+1, COLS-1)
        tries++
      }
      setSelectedCell({ r: nr, c: nc })
      setSelectionStart({ r: nr, c: nc }); setSelectionEnd({ r: nr, c: nc })
      setTimeout(() => focusInput(nr, nc), 0)
    }
    // Let Arrow keys propagate to table handler
    else if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)) {
      // Save current value first
      updateCell(r, c, e.currentTarget.value)
      // Don't stop propagation - let table handleKeyDown handle navigation
    }
  }

  // Determine font color for a row
  const getFontColor = (r: number) => {
    if (r === 0) return 'white'
    if (r === 1 || r === 12 || r === 17 || r === 26) return '#003366'
    return '#333'
  }

  const isBoldRow = (r: number) => {
    return [0,1,11,12,17,26,27].includes(r)
  }

  const getTextAlign = (r: number, c: number) => {
    if (r >= 2 && r <= 8 && c === 0) return 'right'
    if (c === 0) return 'center'
    return 'left'
  }

  return (
    <AppShell>
      <div className="overflow-auto">
        {/* Toolbar */}
        <div className="sticky top-0 z-30 bg-gray-800 text-white text-[10px] px-3 py-1.5 flex flex-wrap items-center gap-3">
          <span className="font-bold">Plan: {plan.toUpperCase()}</span>
          <button onClick={() => { setPlan(p => p === 'vigente' ? 'derogado' : 'vigente'); loadCount() }}
            className="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[9px]">Cambiar Plan</button>

          <span className="text-gray-500">|</span>

          <button onClick={handleMerge} disabled={!hasSelection}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">
            Combinar Celdas
          </button>
          <button onClick={handleUnmerge} disabled={!selectedCell || !getMerge(selectedCell.r, selectedCell.c)}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 px-2 py-0.5 rounded text-[9px]">
            Descombinar
          </button>

          <span className="text-gray-500">|</span>

          {hasSelection && (
            <span className="text-yellow-300">
              Seleccion: {colLetter(selMinC)}{selMinR+1}:{colLetter(selMaxC)}{selMaxR+1} ({selMaxR-selMinR+1}f x {selMaxC-selMinC+1}c)
            </span>
          )}

          {selectedCell && (
            <span className="text-gray-300 flex items-center gap-2 flex-wrap">
              <span className="text-gray-500">|</span>
              Celda: <b>{colLetter(selectedCell.c)}{selectedCell.r+1}</b>
              Ancho: <input type="number" value={colWidths[selectedCell.c]}
                onChange={e => { const w=[...colWidths]; w[selectedCell.c]=parseInt(e.target.value)||40; setColWidths(w) }}
                className="w-14 bg-gray-700 text-white text-[9px] px-1 rounded text-center" />px
              Alto: <input type="number" value={rowHeights[selectedCell.r]}
                onChange={e => { const h=[...rowHeights]; h[selectedCell.r]=parseInt(e.target.value)||20; setRowHeights(h) }}
                className="w-14 bg-gray-700 text-white text-[9px] px-1 rounded text-center" />px
              Fondo: <input type="color" value={bgColors[selectedCell.r][selectedCell.c]}
                onChange={e => { updateBg(selectedCell.r, selectedCell.c, e.target.value); handleApplyBgToSelection(e.target.value) }}
                className="w-6 h-4 cursor-pointer" />
              {hasSelection && <span className="text-[8px] text-gray-400">(se aplica a toda la seleccion)</span>}
            </span>
          )}
        </div>

        <table ref={tableRef} className="border-collapse" onKeyDown={handleKeyDown}>
          <colgroup>
            <col className="w-[35px] bg-gray-100" />
            {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
          </colgroup>
          <tbody>
            {/* Column headers */}
            <tr>
              <td className="border border-gray-400 bg-gray-200 text-[8px] text-center text-gray-500 sticky top-7 left-0 z-20"></td>
              {Array.from({ length: COLS }).map((_, c) => (
                <td key={c} className="border border-gray-400 bg-gray-200 text-[8px] text-center text-gray-500 font-mono sticky top-7 z-10">
                  {colLetter(c)}
                </td>
              ))}
            </tr>

            {/* Data rows */}
            {Array.from({ length: ROWS }).map((_, r) => (
              <tr key={r} style={{ height: `${rowHeights[r]}px` }}>
                <td className="border border-gray-400 bg-gray-200 text-[8px] text-center text-gray-500 sticky left-0 z-5">
                  {r + 1}
                </td>
                {Array.from({ length: COLS }).map((_, c) => {
                  if (isHidden(r, c)) return null

                  const merge = getMerge(r, c)
                  const colSpan = merge ? (merge.ec - merge.sc + 1) : 1
                  const rowSpan = merge ? (merge.er - merge.sr + 1) : 1
                  const selected = isInSelection(r, c)
                  const isThisActive = activeCell?.r === r && activeCell?.c === c

                  return (
                    <td
                      key={c}
                      data-r={r}
                      data-c={c}
                      onClick={(e) => handleCellClick(r, c, e.shiftKey)}
                      onMouseDown={() => { setSelectedCell({r,c}); if (!selectionStart || !e.shiftKey) { setSelectionStart({r,c}); setSelectionEnd({r,c}) } }}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      className={`border text-[9px] p-0 relative
                        ${selected ? 'ring-2 ring-blue-400 z-10' : ''}
                        border-gray-400`}
                      style={{
                        backgroundColor: selected ? '#bbdefb' : bgColors[r][c],
                        color: getFontColor(r),
                        fontWeight: isBoldRow(r) ? 'bold' : 'normal',
                        textAlign: getTextAlign(r, c),
                        verticalAlign: 'middle',
                      }}
                    >
                      <input
                        type="text"
                        defaultValue={cells[r][c]}
                        onBlur={(e) => handleInputBlur(r, c, e.target.value)}
                        onFocus={() => { setActiveCell({r,c}); setSelectedCell({r,c}); setSelectionStart({r,c}); setSelectionEnd({r,c}) }}
                        onKeyDown={(e) => handleInputKeyDown(e, r, c)}
                        className="w-full h-full bg-transparent border-0 outline-none text-[9px] p-0 px-0.5"
                        style={{
                          color: 'inherit',
                          fontWeight: 'inherit',
                          textAlign: 'inherit',
                          minHeight: `${rowHeights[r]}px`,
                          lineHeight: `${rowHeights[r]}px`,
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