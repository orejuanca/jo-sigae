// === Cell-by-Cell Grid Builder Types ===

export interface CellConfig {
  content: string           // Static text label (e.g., "Código:")
  dataBinding: string       // Dot-path to data field (e.g., "student.cedula", "school.denominacion")
  colspan: number           // Default 1
  rowspan: number           // Default 1
  width: string             // e.g., '10%', '100px', '' (auto)
  height: string            // e.g., '20px', 'auto'
  fontSize: number          // Default 9
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  borderTop: boolean        // Default true
  borderRight: boolean      // Default true
  borderBottom: boolean     // Default true
  borderLeft: boolean       // Default true
  borderColor: string       // Default '#000000'
  bgColor: string           // Default '' (transparent)
  color: string             // Default '' (inherit)
  whiteSpace: 'normal' | 'nowrap' | 'pre'
  padding: string           // Default '1px 2px'
  fontStyle: 'normal' | 'italic'
}

export interface GridRow {
  cells: Record<number, CellConfig>  // colIndex -> CellConfig
}

export interface GridConfig {
  totalCols: number
  columnWidths: string[]   // Width per column index, e.g., ['4.57%','13%','13%',...]
  rows: GridRow[]
}

// Factory for empty cell with defaults
export function emptyCell(overrides?: Partial<CellConfig>): CellConfig {
  return {
    content: '', dataBinding: '', colspan: 1, rowspan: 1,
    width: '', height: '', fontSize: 9, fontWeight: 'normal',
    textAlign: 'left', verticalAlign: 'middle',
    borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
    borderColor: '#000000', bgColor: '', color: '', whiteSpace: 'normal',
    padding: '1px 2px', fontStyle: 'normal',
    ...overrides,
  }
}

// Factory for empty row
export function emptyRow(totalCols: number): GridRow {
  const cells: Record<number, CellConfig> = {}
  for (let c = 0; c < totalCols; c++) {
    cells[c] = emptyCell()
  }
  return { cells }
}

// === Data Bindings for Dropdown ===
export const DATA_BINDINGS = [
  { group: 'Estudiante', bindings: [
    { value: 'student.cedula', label: 'Cédula de Identidad' },
    { value: 'student.apellidos', label: 'Apellidos' },
    { value: 'student.nombres', label: 'Nombres' },
    { value: 'student.fechaNacimiento', label: 'Fecha de Nacimiento' },
    { value: 'student.pais', label: 'País de Nacimiento' },
    { value: 'student.estado', label: 'Estado de Nacimiento' },
    { value: 'student.municipio', label: 'Municipio de Nacimiento' },
  ]},
  { group: 'Institución', bindings: [
    { value: 'school.codigo', label: 'Código OD' },
    { value: 'school.denominacion', label: 'Denominación' },
    { value: 'school.direccion', label: 'Dirección' },
    { value: 'school.telefono', label: 'Teléfono' },
    { value: 'school.municipio', label: 'Municipio' },
    { value: 'school.estado', label: 'Estado' },
    { value: 'school.cdcce', label: 'CDCEE' },
  ]},
  { group: 'Documento', bindings: [
    { value: 'doc.planEstudio', label: 'Plan de Estudio' },
    { value: 'doc.codigo', label: 'Código Plan' },
    { value: 'doc.lugar', label: 'Lugar' },
    { value: 'doc.fechaExpedicion', label: 'Fecha de Expedición' },
    { value: 'doc.observaciones', label: 'Observaciones' },
    { value: 'doc.promedioAcumulado', label: 'Promedio Acumulado' },
  ]},
  { group: 'Director', bindings: [
    { value: 'director.nombre', label: 'Nombre del Director' },
    { value: 'director.cedula', label: 'Cédula del Director' },
  ]},
  { group: 'Director CDCEE', bindings: [
    { value: 'cdcee.nombre', label: 'Nombre Director CDCEE' },
    { value: 'cdcee.cedula', label: 'Cédula Director CDCEE' },
  ]},
  { group: 'Instituciones', bindings: [
    ...[0,1,2,3,4].flatMap(i => [
      { value: `inst.${i}.denominacion`, label: `Institución ${i+1} - Denominación` },
      { value: `inst.${i}.localidad`, label: `Institución ${i+1} - Localidad` },
      { value: `inst.${i}.ef`, label: `Institución ${i+1} - E.F.` },
    ])
  ]},
]

// === Display Data Interface (for preview) ===
export interface InstitucionEducativa {
  numero: number
  denominacion: string
  localidad: string
  ef: string
}

export interface DisplayData {
  lugar: string
  fechaExpedicion: string
  planEstudio: string
  planCodigo: string
  od: string
  denominacion: string
  direccion: string
  telefono: string
  municipio: string
  estado: string
  cdcce: string
  estudiante: {
    cedula: string
    fechaNacimiento: string
    apellidos: string
    nombres: string
    pais: string
    estado: string
    municipio: string
  }
  instituciones: InstitucionEducativa[]
  observaciones: string
  promedioAcumulado: string
  director: { apellidosNombres: string; cedula: string }
  directorCdcce: { apellidosNombres: string; cedula: string }
}

// === Data Resolution for Preview ===
export function resolveBinding(path: string, data: DisplayData): string {
  if (!path || !data) return ''
  const [domain, ...rest] = path.split('.')
  switch (domain) {
    case 'student': return rest.reduce((o: any, k: string) => o?.[k], data.estudiante) || ''
    case 'school': {
      const schoolMap: Record<string, string> = {
        codigo: data.od, denominacion: data.denominacion, direccion: data.direccion,
        telefono: data.telefono, municipio: data.municipio, estado: data.estado, cdcce: data.cdcce
      }
      return schoolMap[rest[0]] || ''
    }
    case 'doc': {
      const docMap: Record<string, string> = {
        planEstudio: data.planEstudio, codigo: data.planCodigo,
        lugar: data.lugar, fechaExpedicion: data.fechaExpedicion,
        observaciones: data.observaciones, promedioAcumulado: data.promedioAcumulado
      }
      return docMap[rest[0]] || ''
    }
    case 'director':
      return rest[0] === 'nombre' ? (data.director?.apellidosNombres || '') : (data.director?.cedula || '')
    case 'cdcee':
      return rest[0] === 'nombre' ? (data.directorCdcce?.apellidosNombres || '') : (data.directorCdcce?.cedula || '')
    case 'inst': {
      const idx = parseInt(rest[0])
      const field = rest[1]
      return data.instituciones[idx]?.[field as keyof InstitucionEducativa] || '*'
    }
    default: return ''
  }
}

// === Helpers for building template ===
function c(content: string, dataBinding?: string, overrides?: Partial<CellConfig>): CellConfig {
  return emptyCell({ content, dataBinding, ...overrides })
}

function row(cells: [number, CellConfig][]): GridRow {
  const allCells: Record<number, CellConfig> = {}
  cells.forEach(([col, cell]) => { allCells[col] = cell })
  return { cells: allCells }
}

// Bold cell shorthand
function b(content: string, dataBinding?: string, overrides?: Partial<CellConfig>): CellConfig {
  return emptyCell({ content, dataBinding, fontWeight: 'bold', ...overrides })
}

// Header cell (bold, centered, middle)
function h(content: string, overrides?: Partial<CellConfig>): CellConfig {
  return emptyCell({ content, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', ...overrides })
}

// === Default Template ===
export function createDefaultTemplate(): GridConfig {
  const COLS = 27
  const colWidths = Array(COLS).fill(`${(100 / COLS).toFixed(2)}%`)

  const rows: GridRow[] = []

  // ==================== SECTION I: ENCABEZADO (Rows 0-2) ====================
  // Row 0: Logo (rowspan=3) + Title
  rows.push(row([
    [0, c('', '', { rowspan: 3, verticalAlign: 'middle', padding: '2px', height: '60px' })],
    [1, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [2, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [3, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [4, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [5, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [6, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [7, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [8, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [9, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [10, c('', '', { rowspan: 3, borderTop: false, borderRight: false, borderBottom: true, borderLeft: false })],
    [11, c('', '', { rowspan: 3, borderTop: false, borderBottom: true, borderLeft: false })],
    [12, c('CERTIFICACIÓN DE CALIFICACIONES EMG', '', { colspan: 15, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: 9, padding: '4px 4px' })],
  ]))

  // Row 1: Plan de Estudio + Código
  rows.push(row([
    [12, b('I. Plan de Estudio:  ', 'doc.planEstudio', { colspan: 10, padding: '1px 3px' })],
    [22, b('Código  ', 'doc.codigo', { colspan: 5, padding: '1px 3px' })],
  ]))

  // Row 2: Lugar y Fecha
  rows.push(row([
    [12, b('Lugar y Fecha de Expedición:', '', { colspan: 7, padding: '1px 3px' })],
    [19, c('', 'doc.lugar', { colspan: 3, textAlign: 'right', borderRight: false, padding: '1px 3px' })],
    [22, c('', 'doc.fechaExpedicion', { colspan: 5, borderLeft: false, padding: '1px 3px' })],
  ]))

  // ==================== SECTION II: DATOS DE LA INSTITUCIÓN (Rows 3-6) ====================
  // Row 3: Section header
  rows.push(row([
    [0, h('II. Datos de la Institución Educativa o Centro de Desarrollo de la Calidad Educativa Estadal (CDCEE) que Emite la Certificación:', { colspan: 27 })],
  ]))

  // Row 4: Código + Denominación
  rows.push(row([
    [0, c('Código:', '')],                                                    // A-C (3)
    [3, c('', 'school.codigo', { colspan: 5 })],                             // D-H (5)
    [8, h('Denominación y Epónimo:', { colspan: 5 })],                       // I-M (5)
    [13, c('', '', { borderTop: true, borderRight: true, borderBottom: true, borderLeft: false, borderColor: '#000000' })], // N (gap with left border off)
    [14, c('', 'school.denominacion', { colspan: 13 })],                     // O-AA (13)
  ]))

  // Row 5: Dirección + Teléfono
  rows.push(row([
    [0, c('Dirección:', '')],                                                 // A-C (3)
    [3, c('', 'school.direccion', { colspan: 15 })],                         // D-R (15)
    [18, c('Teléfono:', '')],                                                // S-U (3)
    [21, c('', 'school.telefono', { colspan: 6, textAlign: 'center' })],     // V-AA (6)
  ]))

  // Row 6: Municipio + Estado + CDCEE
  rows.push(row([
    [0, c('Municipio:', '')],                                                 // A-C (3)
    [3, c('', 'school.municipio', { colspan: 4, textAlign: 'center' })],     // D-G (4)
    [7, c('Estado:', '', { textAlign: 'center' })],                          // H-J (3)
    [10, c('', 'school.estado', { colspan: 8, textAlign: 'center' })],      // K-R (8)
    [18, c('CDCEE:', '')],                                                   // S-V (4)
    [22, c('', 'school.cdcce', { colspan: 5, textAlign: 'center' })],      // W-AA (5)
  ]))

  // ==================== SECTION III: DATOS DEL ESTUDIANTE (Rows 7-10) ====================
  // Row 7: Section header
  rows.push(row([
    [0, h('III. Datos de Identificación del Estudiante:', { colspan: 27 })],
  ]))

  // Row 8: Cédula + Fecha de Nacimiento
  rows.push(row([
    [0, c('Cédula de Identidad:', '', { colspan: 4 })],                     // A-D (4)
    [4, c('', 'student.cedula', { colspan: 5 })],                           // E-I (5)
    [9, c('Fecha de Nacimiento:', '', { colspan: 6 })],                     // J-O (6)
    [15, c('', 'student.fechaNacimiento', { colspan: 12 })],                // P-AA (12)
  ]))

  // Row 9: Apellidos + Nombres
  rows.push(row([
    [0, c('Apellidos:', '')],                                                // A-C (3)
    [3, c('', 'student.apellidos', { colspan: 8 })],                        // D-K (8)
    [11, c('Nombres:', '')],                                                // L-O (4)
    [15, c('', 'student.nombres', { colspan: 12 })],                        // P-AA (12)
  ]))

  // Row 10: País + Estado + Municipio
  rows.push(row([
    [0, c('Lugar de Nacimiento País:', '', { colspan: 5 })],                // A-E (5)
    [5, c('', 'student.pais', { colspan: 6 })],                             // F-K (6)
    [11, c('Estado:', '', { textAlign: 'center' })],                        // L-M (2)
    [13, c('', 'student.estado', { colspan: 7 })],                          // N-T (7)
    [20, c('Municipio:', '', { textAlign: 'center' })],                     // U-V (2)
    [22, c('', 'student.municipio', { colspan: 5 })],                       // W-AA (5)
  ]))

  // ==================== SECTION IV: INSTITUCIONES EDUCATIVAS (Rows 11-14) ====================
  // Row 11: Section header left + column headers right
  rows.push(row([
    [0, h('IV. Instituciones Educativas donde Cursó Estudios', { colspan: 13 })],  // A-M (left)
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })], // N (sep)
    [14, h('N°', { colspan: 1 })],                                           // O (1)
    [15, h('Denominación y Epónimo de la Institución Educativa', { colspan: 6 })], // P-U (6)
    [21, h('Localidad', { colspan: 5 })],                                    // V-Z (5)
    [26, h('E.F.', { colspan: 1 })],                                         // AA (1)
  ]))

  // Row 12: Left column headers + Right data row 3
  rows.push(row([
    [0, h('N°')],                                                            // A
    [1, h('Denominación y Epónimo de la Institución Educativa', { colspan: 6 })], // B-G (6)
    [7, h('Localidad', { colspan: 5 })],                                     // H-L (5)
    [12, h('E.F.')],                                                         // M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })], // N (sep)
    [14, c('3', '', { textAlign: 'center', fontWeight: 'bold' })],           // O
    [15, c('', 'inst.2.denominacion', { colspan: 6 })],                     // P-U (6)
    [21, c('', 'inst.2.localidad', { colspan: 5 })],                        // V-Z (5)
    [26, c('', 'inst.2.ef', { textAlign: 'center' })],                      // AA
  ]))

  // Row 13: Left data 1 + Right data 4
  rows.push(row([
    [0, c('1', '', { textAlign: 'center', fontWeight: 'bold' })],           // A
    [1, c('', 'inst.0.denominacion', { colspan: 6 })],                     // B-G (6)
    [7, c('', 'inst.0.localidad', { colspan: 5 })],                        // H-L (5)
    [12, c('', 'inst.0.ef', { textAlign: 'center' })],                     // M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })], // N (sep)
    [14, c('4', '', { textAlign: 'center', fontWeight: 'bold' })],           // O
    [15, c('', 'inst.3.denominacion', { colspan: 6 })],                     // P-U (6)
    [21, c('', 'inst.3.localidad', { colspan: 5 })],                        // V-Z (5)
    [26, c('', 'inst.3.ef', { textAlign: 'center' })],                      // AA
  ]))

  // Row 14: Left data 2 + Right data 5
  rows.push(row([
    [0, c('2', '', { textAlign: 'center', fontWeight: 'bold' })],           // A
    [1, c('', 'inst.1.denominacion', { colspan: 6 })],                     // B-G (6)
    [7, c('', 'inst.1.localidad', { colspan: 5 })],                        // H-L (5)
    [12, c('', 'inst.1.ef', { textAlign: 'center' })],                     // M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })], // N (sep)
    [14, c('5', '', { textAlign: 'center', fontWeight: 'bold' })],           // O
    [15, c('', 'inst.4.denominacion', { colspan: 6 })],                     // P-U (6)
    [21, c('', 'inst.4.localidad', { colspan: 5 })],                        // V-Z (5)
    [26, c('', 'inst.4.ef', { textAlign: 'center' })],                      // AA
  ]))

  // ==================== SECTION V: PLAN DE ESTUDIO (Rows 15+) ====================
  // Row 15: Section V header (no bottom border)
  rows.push(row([
    [0, h('V. Plan de Estudio:', { colspan: 27, borderBottom: false })],
  ]))

  // === Year Pair: 1° Año (left) + 2° Año (right) ===
  // Row 16: Year names
  rows.push(row([
    [0, h('PRIMER AÑO', { colspan: 13, borderTop: false })],               // A-M (left half)
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })], // N (sep)
    [14, h('SEGUNDO AÑO', { colspan: 13, borderTop: false })],              // O-AA (right half)
  ]))

  // Row 17: Sub-header row 1
  rows.push(row([
    // Left half (7 logical cols from 13): Areas(4) + CALIFICACION(5) + T-E(1) + FECHA(2) + Inst(1) = 13
    [0, h('ÁREAS DE FORMACIÓN', { colspan: 4, rowspan: 2 })],              // A-D (4)
    [4, h('CALIFICACIÓN', { colspan: 5 })],                                 // E-I (5)
    [9, h('T-E', { rowspan: 2 })],                                          // J (1)
    [10, h('FECHA', { colspan: 2 })],                                       // K-L (2)
    [12, h('Inst.', { rowspan: 2, fontSize: 7, padding: '0 1px' })],      // M (1)
    // Separator
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    // Right half
    [14, h('ÁREAS DE FORMACIÓN', { colspan: 4, rowspan: 2 })],             // O-R (4)
    [18, h('CALIFICACIÓN', { colspan: 5 })],                                // S-W (5)
    [23, h('T-E', { rowspan: 2 })],                                         // X (1)
    [24, h('FECHA', { colspan: 2 })],                                       // Y-Z (2)
    [26, h('Inst.', { rowspan: 2, fontSize: 7, padding: '0 1px' })],      // AA (1)
  ]))

  // Row 18: Sub-header row 2
  rows.push(row([
    // Left half
    [4, h('N°', { colspan: 1 })],                                           // E (1)
    [5, h('LETRAS', { colspan: 4 })],                                       // F-I (4)
    [10, h('Mes', { colspan: 1 })],                                         // K (1)
    [11, h('Año', { colspan: 1 })],                                         // L (1)
    // Separator
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    // Right half
    [18, h('N°', { colspan: 1 })],                                          // S (1)
    [19, h('LETRAS', { colspan: 4 })],                                      // T-W (4)
    [24, h('Mes', { colspan: 1 })],                                         // Y (1)
    [25, h('Año', { colspan: 1 })],                                         // Z (1)
  ]))

  // Row 19-20: Example data rows (user will add more)
  // Data row 1 (left: subject, right: subject)
  rows.push(row([
    [0, c('Castellano', '', { verticalAlign: 'top', whiteSpace: 'normal', height: '16px' })], // A-D
    [4, c('', '', { textAlign: 'center', fontWeight: 'bold' })],             // E
    [5, c('', '', { textAlign: 'left', colspan: 4 })],                       // F-I
    [9, c('', '', { textAlign: 'center' })],                                 // J
    [10, c('', '', { textAlign: 'center' })],                                // K
    [11, c('', '', { textAlign: 'center', fontSize: 7 })],                   // L
    [12, c('', '', { textAlign: 'center', fontSize: 5, padding: '0 1px' })],// M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, c('Castellano', '', { verticalAlign: 'top', whiteSpace: 'normal', height: '16px' })],
    [18, c('', '', { textAlign: 'center', fontWeight: 'bold' })],
    [19, c('', '', { textAlign: 'left', colspan: 4 })],
    [23, c('', '', { textAlign: 'center' })],
    [24, c('', '', { textAlign: 'center' })],
    [25, c('', '', { textAlign: 'center', fontSize: 7 })],
    [26, c('', '', { textAlign: 'center', fontSize: 5, padding: '0 1px' })],
  ]))

  rows.push(row([
    [0, c('Inglés y otras Lenguas Extranjeras', '', { verticalAlign: 'top', whiteSpace: 'normal', height: '16px' })],
    [4, c('', '', { textAlign: 'center', fontWeight: 'bold' })],
    [5, c('', '', { textAlign: 'left', colspan: 4 })],
    [9, c('', '', { textAlign: 'center' })],
    [10, c('', '', { textAlign: 'center' })],
    [11, c('', '', { textAlign: 'center', fontSize: 7 })],
    [12, c('', '', { textAlign: 'center', fontSize: 5, padding: '0 1px' })],
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, c('Inglés y otras Lenguas Extranjeras', '', { verticalAlign: 'top', whiteSpace: 'normal', height: '16px' })],
    [18, c('', '', { textAlign: 'center', fontWeight: 'bold' })],
    [19, c('', '', { textAlign: 'left', colspan: 4 })],
    [23, c('', '', { textAlign: 'center' })],
    [24, c('', '', { textAlign: 'center' })],
    [25, c('', '', { textAlign: 'center', fontSize: 7 })],
    [26, c('', '', { textAlign: 'center', fontSize: 5, padding: '0 1px' })],
  ]))

  // ==================== SECTION VI: OBSERVACIONES (Row 21) ====================
  rows.push(row([
    [0, b('VI. Observaciones:', '', { whiteSpace: 'nowrap' })],             // A-C (3)
    [3, b('P.A.:', '', { whiteSpace: 'nowrap' })],                          // D (1)
    [4, c('', 'doc.promedioAcumulado', { colspan: 3, textAlign: 'center', width: '100px' })], // E-G (3)
    [7, c('', 'doc.observaciones', { colspan: 20 })],                       // H-AA (20)
  ]))

  // ==================== SECCIÓN VII + VIII: DIRECTORES (Rows 22-30) ====================
  // Row 22: Headers side by side
  rows.push(row([
    [0, h('VII. Institución Educativa', { colspan: 13 })],                  // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, h('VIII. Centro de Desarrollo de la Calidad Educativa Estadal', { colspan: 13 })], // O-AA
  ]))

  // Row 23: Director(a) + Sello
  rows.push(row([
    [0, h('Director(a)', { colspan: 4, fontSize: 7 })],                     // A-D
    [4, h('SELLO DE LA INSTITUCIÓN EDUCATIVA', { colspan: 9, fontSize: 7 })], // E-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, h('Director(a)', { colspan: 4, fontSize: 7 })],                    // O-R
    [18, h('SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL', { colspan: 9, fontSize: 7 })], // S-AA
  ]))

  // Row 24: "Apellidos y Nombres:" label
  rows.push(row([
    [0, b('Apellidos y Nombres:', '', { colspan: 13 })],                    // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, b('Apellidos y Nombres:', '', { colspan: 13 })],                   // O-AA
  ]))

  // Row 25: Director name value
  rows.push(row([
    [0, c('', 'director.nombre', { colspan: 13 })],                         // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, c('', 'cdcee.nombre', { colspan: 13 })],                           // O-AA
  ]))

  // Row 26: "Cédula de Identidad:" label
  rows.push(row([
    [0, b('Cédula de Identidad:', '', { colspan: 13 })],                    // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, b('Cédula de Identidad:', '', { colspan: 13 })],                   // O-AA
  ]))

  // Row 27: Director cedula value
  rows.push(row([
    [0, c('', 'director.cedula', { colspan: 13 })],                         // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, c('', 'cdcee.cedula', { colspan: 13 })],                           // O-AA
  ]))

  // Row 28: "Firma:"
  rows.push(row([
    [0, b('Firma:', '', { colspan: 13 })],                                  // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, b('Firma:', '', { colspan: 13 })],                                 // O-AA
  ]))

  // Row 29: Validez text
  rows.push(row([
    [0, c('Para efectos de su Validez Nacional', '', { colspan: 13, fontStyle: 'italic', textAlign: 'center', fontSize: 7 })], // A-M
    [13, c('', '', { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })],
    [14, c('Para efectos de su Validez Internacional', '', { colspan: 13, fontStyle: 'italic', textAlign: 'center', fontSize: 7 })], // O-AA
  ]))

  // ==================== VALOR FISCAL (Row 30) ====================
  rows.push(row([
    [0, c('VALOR FISCAL: Para su validez legal y de acuerdo al Ramo de Estampillas, al dorso de este documento se le debe colocar tres décimas de la Unidad Tributaria (0,3 U.T.)', '', { colspan: 27, textAlign: 'center', fontWeight: 'bold', fontSize: 7 })],
  ]))

  return { totalCols: COLS, columnWidths: colWidths, rows }
}