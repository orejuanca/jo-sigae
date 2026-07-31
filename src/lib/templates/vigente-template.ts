export const INIT_COLS = 40
export const INIT_ROWS = 51

export type Align = 'left' | 'center' | 'right'

function makeEmpty2D<T>(rows: number, cols: number, fill: T): T[][] {
  const a: T[][] = []
  for (let r = 0; r < rows; r++) { a[r] = []; for (let c = 0; c < cols; c++) a[r][c] = fill }
  return a
}

export function makeInitialCells(): string[][] {
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
  // C15-C19 (filas 14-18, 0-indexed): plantel por defecto
  for (let i = 14; i <= 18; i++) { c[i][2] = '* * * * *' }
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

export function makeInitialWidths(): number[] {
  const w = [30,160,80,30, 130,40,30,30,50,100, 130,40,30,30,50,100, 40,130,40,30, 130,40,30,30,50,100, 40,130,40,30, 30,50,100, 40,130,40,30,30,50,100]
  while (w.length < INIT_COLS) w.push(80)
  return w
}

export function makeInitialHeights(rows: number): number[] {
  const h: number[] = []
  for (let r = 0; r < rows; r++) h[r] = r <= 1 ? 28 : r <= 11 ? 22 : 20
  return h
}

export function makeInitialBg(rows: number, cols: number): string[][] {
  const b = makeEmpty2D(rows, cols, '#ffffff')
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r===0) b[r][c]='#0080ff'; else if (r===1) b[r][c]='#b3d9ff'; else if (r>=2&&r<=11) b[r][c]='#ffffcc'
    else if (r===12||r===17) b[r][c]='#b3d9ff'; else if (r>=13&&r<=25) b[r][c]='#ffffcc'
    else if (r===26) b[r][c]='#b3d9ff'; else if (r===27) b[r][c]='#ffffcc'
  }
  return b
}

export function makeInitialAlign(rows: number, cols: number): Align[][] {
  const a = makeEmpty2D<Align>(rows, cols, 'left')
  for (let r = 0; r < rows; r++) a[r][0] = 'center'
  for (let r = 2; r <= 8; r++) a[r][0] = 'right'
  return a
}

export function makeInitialFontFamilies(rows: number, cols: number): string[][] {
  return makeEmpty2D(rows, cols, 'Arial')
}

export function makeInitialFontSizes(rows: number, cols: number): number[][] {
  return makeEmpty2D(rows, cols, 9)
}

export function makeInitialFontColors(rows: number, cols: number): string[][] {
  const fc = makeEmpty2D(rows, cols, '#333333')
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === 0) fc[r][c] = 'white'
    else if ([1,12,17,26].includes(r)) fc[r][c] = '#003366'
  }
  return fc
}

export function makeInitialBorders(rows: number, cols: number): boolean[][] {
  return makeEmpty2D(rows, cols, false)
}

export function makeInitialBold(rows: number, cols: number): boolean[][] {
  const b = makeEmpty2D(rows, cols, false)
  for (const r of [0,1,11,12,17,26,27]) for (let c = 0; c < cols; c++) b[r][c] = true
  return b
}
