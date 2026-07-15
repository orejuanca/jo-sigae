'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'

const COLS = 40
const ROWS = 51

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)
  const [cells, setCells] = useState<string[][]>(() => {
    const c: string[][] = []
    for (let r = 0; r < ROWS; r++) {
      c[r] = []
      for (let col = 0; col < COLS; col++) c[r][col] = ''
    }
    // Precargar contenido fijo
    // Fila 0: Titulo (merge A0:AN0)
    c[0][0] = 'AGREGAR DATOS, NOTAS Y OBSERVACIONES PARA CERTIFICACION DE CALIFICACIONES EMG 31059 - CONSTANCIA - BOLETIN - VALIDACION DE TITULO Y NOTAS'
    // Fila 1: Subheaders
    c[1][0] = 'DATOS PERSONALES'
    c[1][7] = 'CIRCULAR N 05, (02/07/2003) (modificada al 30/03/2007)'
    // Fila 2: CEDULA
    c[2][0] = 'CEDULA:'
    // Fila 3: FECHA NAC
    c[3][0] = 'FECHA DE NACIMIENTO:'
    // Fila 4: APELLIDOS
    c[4][0] = 'APELLIDOS:'
    // Fila 5: NOMBRES
    c[5][0] = 'NOMBRES:'
    // Fila 6: PAIS
    c[6][0] = 'PAIS DE NACIMIENTO:'
    c[6][1] = 'VENEZUELA'
    // Fila 7: ESTADO
    c[7][0] = 'ESTADO:'
    // Fila 8: MUNICIPIO
    c[8][0] = 'MUNICIPIO:'
    // Fila 9: Credito
    c[9][0] = 'Programacion y Diseno por Juan C. Orellana R.'
    // Fila 11: Headers tabla
    c[11][0] = 'N'
    c[11][1] = 'NOMBRE DEL PLANTEL'
    c[11][2] = 'LOCALIDAD'
    c[11][3] = 'E.F.'
    c[11][4] = 'PRIMER AO'
    c[11][10] = 'SEGUNDO AO'
    c[11][16] = 'SECCION'
    // Fila 12: Sub-headers
    c[12][4] = 'AREAS DE FORMACION'
    c[12][5] = 'NOTA'
    c[12][6] = 'T-E'
    c[12][7] = 'FECHA'
    c[12][8] = 'PLANTEL'
    c[12][10] = 'AREAS DE FORMACION'
    c[12][11] = 'NOTA'
    c[12][12] = 'T-E'
    c[12][13] = 'FECHA'
    c[12][14] = 'PLANTEL'
    c[12][16] = 'AREAS'
    c[12][17] = 'OC'
    c[12][18] = 'PG'
    // Materias 1er ao
    const m1 = ['Castellano', 'Matematicas', 'Educacion Fisica', 'Arte y Patrimonio', 'Ciencias Naturales']
    const m2 = ['Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Arte y Patrimonio', 'Ciencias Naturales']
    for (let i = 0; i < 5; i++) {
      c[13 + i][0] = String(i + 1)
      c[13 + i][4] = m1[i]
      c[13 + i][10] = m2[i]
    }
    // Fila 17: Headers 3er, 4to, 5to
    c[17][0] = 'TERCER AO'
    c[17][4] = 'SECCION'
    c[17][6] = 'AREAS DE FORMACION'
    c[17][7] = 'NOTA'
    c[17][8] = 'T-E'
    c[17][9] = 'FECHA'
    c[17][10] = 'PLANTEL'
    c[17][11] = 'CUARTO AO'
    c[17][15] = 'SECCION'
    c[17][17] = 'AREAS DE FORMACION'
    c[17][18] = 'NOTA'
    c[17][19] = 'T-E'
    c[17][20] = 'FECHA'
    c[17][21] = 'PLANTEL'
    c[17][22] = 'QUINTO AO'
    c[17][26] = 'SECCION'
    c[17][28] = 'AREAS DE FORMACION'
    c[17][29] = 'NOTA'
    c[17][30] = 'T-E'
    c[17][31] = 'FECHA'
    c[17][32] = 'PLANTEL'
    c[17][33] = 'GRUPO'
    // Materias 3er, 4to, 5to
    const m3 = ['Castellano', 'Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Fisica', 'Quimica', 'Biologia', 'Geografia, Hist. y Ciudad.', 'Form. para la Sober. Nal.']
    const m4 = ['Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Fisica', 'Quimica', 'Biologia', 'Geografia, Hist. y Ciudad.', 'Form. para la Sober. Nal.']
    const m5 = ['Castellano', 'Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Fisica', 'Quimica', 'Ciencias de la Tierra', 'Geografia, Hist. y Ciudad.']
    for (let i = 0; i < 9; i++) {
      if (i < m3.length) c[18 + i][6] = m3[i]
      if (i < m4.length) c[18 + i][17] = m4[i]
      if (i < m5.length) c[18 + i][28] = m5[i]
    }
    // Fila 26: Validacion header
    c[26][0] = 'VALIDACION TITULO / NOTAS'
    c[26][1] = 'VALIDACION TITULO / NOTAS'
    c[26][2] = 'Serial T.'
    c[26][3] = 'Fecha Emision T.'
    c[26][4] = 'Ao Egreso T.'
    c[26][5] = 'Fecha Emision N.'
    c[26][6] = 'Promedio Total'
    c[26][7] = '*'
    // Fila 27: Observaciones
    c[27][0] = 'Observaciones:'
    return c
  })

  const [colWidths, setColWidths] = useState<number[]>(() => {
    // A=30, B=160, C=80, D=30, luego se repite patrones
    const w = [
      30, 160, 80, 30, // A-D: Planteles
      130, 40, 30, 30, 50, 100, // E-J: 1er Ao
      130, 40, 30, 30, 50, 100, // K-P: 2do Ao
      40, 130, 40, 30, // Q-T: Seccion/OC/PG
      130, 40, 30, 30, 50, 100, // U-Z: 3er Ao
      40, 130, 40, 30, // AA-AD
      30, 50, 100, // AE-AG
      40, 130, 40, 30, 30, 50, 100, // AH-AN: 5to Ao
    ]
    while (w.length < COLS) w.push(80)
    return w
  })

  const [rowHeights, setRowHeights] = useState<number[]>(() => {
    const h: number[] = []
    for (let r = 0; r < ROWS; r++) h[r] = r <= 1 ? 28 : r <= 11 ? 22 : 20
    return h
  })

  // Colores de fondo por celda (editable)
  const [bgColors, setBgColors] = useState<string[][]>(() => {
    const b: string[][] = []
    for (let r = 0; r < ROWS; r++) {
      b[r] = []
      for (let c = 0; c < COLS; c++) {
        if (r === 0) b[r][c] = '#0080ff' // titulo cyan
        else if (r === 1) b[r][c] = '#b3d9ff' // subheaders
        else if (r >= 2 && r <= 11) b[r][c] = '#ffffcc' // datos personales + botones
        else if (r === 12 || r === 17) b[r][c] = '#b3d9ff' // sub-headers tabla
        else if (r >= 13 && r <= 25) b[r][c] = '#ffffcc' // datos tabla
        else if (r === 26) b[r][c] = '#b3d9ff' // validacion header
        else if (r === 27) b[r][c] = '#ffffcc' // observaciones
        else b[r][c] = '#ffffff'
      }
    }
    return b
  })

  const updateCell = (r: number, c: number, val: string) => {
    setCells(prev => {
      const copy = prev.map(row => [...row])
      copy[r][c] = val
      return copy
    })
  }

  const updateBg = (r: number, c: number, color: string) => {
    setBgColors(prev => {
      const copy = prev.map(row => [...row])
      copy[r][c] = color
      return copy
    })
  }

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?plan=${plan}`)
      const data = await res.json()
      setTotalRecords(data.totalStudents || 0)
      // Poner conteo en celda H4 (fila 3, col 7)
      updateCell(3, 7, `${data.totalStudents} Registros en la Base de Datos.`)
      const today = new Date()
      const ds = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
      updateCell(2, 7, ds)
      updateCell(2, 20, 'IR A ' + (plan === 'vigente' ? 'PLANES DEROGADOS' : 'PLAN VIGENTE'))
    } catch {}
  }, [plan])

  useEffect(() => { loadCount() }, [loadCount])

  const colLetter = (i: number) => {
    let s = ''
    let n = i
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
    return s
  }

  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)

  const handleCellClick = (r: number, c: number) => {
    setSelectedCell({ r, c })
    setEditMode(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return
    let { r, c } = selectedCell
    if (e.key === 'ArrowDown') { e.preventDefault(); r = Math.min(r + 1, ROWS - 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); r = Math.max(r - 1, 0) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); c = Math.min(c + 1, COLS - 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); c = Math.max(c - 1, 0) }
    else if (e.key === 'Tab') { e.preventDefault(); c = e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, COLS - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); r = Math.min(r + 1, ROWS - 1) }
    else return
    setSelectedCell({ r, c })
    setEditMode(false)
    const td = tableRef.current?.querySelector(`[data-r="${r}"][data-c="${c}"]`) as HTMLElement
    td?.focus()
  }

  return (
    <AppShell>
      <div className="overflow-auto">
        {/* Barra de info */}
        <div className="sticky top-0 z-10 bg-gray-800 text-white text-[10px] px-3 py-1.5 flex items-center gap-4">
          <span className="font-bold">Plan: {plan.toUpperCase()}</span>
          <button onClick={() => { setPlan(p => p === 'vigente' ? 'derogado' : 'vigente'); loadCount() }}
            className="bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[9px]">
            Cambiar Plan
          </button>
          {selectedCell && (
            <span className="text-gray-300">
              Celda: {colLetter(selectedCell.c)}{selectedCell.r + 1} | 
              Ancho col {colLetter(selectedCell.c)}: <input
                type="number" value={colWidths[selectedCell.c]}
                onChange={e => { const w = [...colWidths]; w[selectedCell.c] = parseInt(e.target.value) || 40; setColWidths(w) }}
                className="w-12 bg-gray-700 text-white text-[9px] px-1 rounded text-center"
              />px |
              Alto fila {selectedCell.r + 1}: <input
                type="number" value={rowHeights[selectedCell.r]}
                onChange={e => { const h = [...rowHeights]; h[selectedCell.r] = parseInt(e.target.value) || 20; setRowHeights(h) }}
                className="w-12 bg-gray-700 text-white text-[9px] px-1 rounded text-center"
              />px |
              Fondo: <input
                type="color" value={bgColors[selectedCell.r][selectedCell.c]}
                onChange={e => updateBg(selectedCell.r, selectedCell.c, e.target.value)}
                className="w-6 h-4 cursor-pointer"
              />
            </span>
          )}
        </div>

        <table ref={tableRef} className="border-collapse" onKeyDown={handleKeyDown}>
          <colgroup>
            {/* Columna de numeros de fila */}
            <col className="w-[35px] bg-gray-100" />
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>
          <tbody>
            {/* Header de columnas */}
            <tr>
              <td className="border border-gray-400 bg-gray-200 text-[8px] text-center text-gray-500 sticky top-7 left-0 z-20"></td>
              {Array.from({ length: COLS }).map((_, c) => (
                <td key={c} className="border border-gray-400 bg-gray-200 text-[8px] text-center text-gray-500 font-mono sticky top-7 z-10">
                  {colLetter(c)}
                </td>
              ))}
            </tr>

            {/* Filas de datos */}
            {Array.from({ length: ROWS }).map((_, r) => (
              <tr key={r}>
                <td className="border border-gray-400 bg-gray-200 text-[8px] text-center text-gray-500 sticky left-0 z-5">
                  {r + 1}
                </td>
                {Array.from({ length: COLS }).map((_, c) => (
                  <td
                    key={c}
                    data-r={r}
                    data-c={c}
                    contentEditable
                    suppressContentEditableWarning
                    tabIndex={0}
                    onClick={() => handleCellClick(r, c)}
                    onFocus={() => handleCellClick(r, c)}
                    onBlur={e => updateCell(r, c, e.currentTarget.textContent || '')}
                    className="border border-gray-400 text-[9px] p-0 outline-none focus:ring-1 focus:ring-blue-500 focus:z-10 relative"
                    style={{
                      backgroundColor: bgColors[r][c],
                      height: `${rowHeights[r]}px`,
                      minHeight: `${rowHeights[r]}px`,
                      color: r === 0 ? 'white' : (r === 1 || r === 12 || r === 17 || r === 26) ? '#003366' : '#333',
                      fontWeight: (r === 0 || r === 1 || r === 11 || r === 12 || r === 17 || r === 26 || r === 27) ? 'bold' : 'normal',
                      textAlign: (r >= 2 && r <= 8 && c === 0) ? 'right' : (c === 0 ? 'center' : 'left'),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    {cells[r][c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}