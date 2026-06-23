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

// ============================================================
// Patch calif/orient/grupo/obs bindings onto ANY loaded template
// Call this after loading from localStorage or DB so bindings
// are always up-to-date without losing visual corrections.
// ============================================================
export function patchDataBindings(config: GridConfig) {
  const { rows } = config
  const bind = (rowIdx: number, colIdx: number, binding: string) => {
    const cell = rows[rowIdx]?.cells[colIdx]
    if (cell) cell.dataBinding = binding
  }

  // --- 1st/2nd year (rows 21-27, idx 20-26, 7 subjects each) ---
  for (let s = 0; s < 7; s++) {
    const r = 20 + s
    bind(r, 4, `calif.1.${s}.nota`)
    bind(r, 5, `calif.1.${s}.literal`)
    bind(r, 9, `calif.1.${s}.te`)
    bind(r, 10, `calif.1.${s}.mes`)
    bind(r, 11, `calif.1.${s}.anio`)
    bind(r, 12, `calif.1.${s}.inst`)
    bind(r, 18, `calif.2.${s}.nota`)
    bind(r, 19, `calif.2.${s}.literal`)
    bind(r, 23, `calif.2.${s}.te`)
    bind(r, 24, `calif.2.${s}.mes`)
    bind(r, 25, `calif.2.${s}.anio`)
    bind(r, 26, `calif.2.${s}.inst`)
  }

  // --- 3rd/4th year (rows 31-38, idx 30-37, 8 subjects each) ---
  for (let s = 0; s < 8; s++) {
    const r = 30 + s
    bind(r, 4, `calif.3.${s}.nota`)
    bind(r, 5, `calif.3.${s}.literal`)
    bind(r, 9, `calif.3.${s}.te`)
    bind(r, 10, `calif.3.${s}.mes`)
    bind(r, 11, `calif.3.${s}.anio`)
    bind(r, 12, `calif.3.${s}.inst`)
    bind(r, 18, `calif.4.${s}.nota`)
    bind(r, 19, `calif.4.${s}.literal`)
    bind(r, 23, `calif.4.${s}.te`)
    bind(r, 24, `calif.4.${s}.mes`)
    bind(r, 25, `calif.4.${s}.anio`)
    bind(r, 26, `calif.4.${s}.inst`)
  }

  // --- 4th year 9th subject: Formación Soberanía (row 39, idx 38) ---
  bind(38, 18, 'calif.4.8.nota')
  bind(38, 19, 'calif.4.8.literal')
  bind(38, 23, 'calif.4.8.te')
  bind(38, 24, 'calif.4.8.mes')
  bind(38, 25, 'calif.4.8.anio')
  bind(38, 26, 'calif.4.8.inst')

  // --- 5th year (rows 43-52, idx 42-51, 10 subjects) ---
  for (let s = 0; s < 10; s++) {
    const r = 42 + s
    bind(r, 4, `calif.5.${s}.nota`)
    bind(r, 5, `calif.5.${s}.literal`)
    bind(r, 9, `calif.5.${s}.te`)
    bind(r, 10, `calif.5.${s}.mes`)
    bind(r, 11, `calif.5.${s}.anio`)
    bind(r, 12, `calif.5.${s}.inst`)
  }

  // --- Orientación y Convivencia (rows 42-46, idx 41-45) ---
  for (let i = 0; i < 5; i++) {
    bind(41 + i, 20, `orient.${i}.literal`)
  }

  // --- Grupos de Creación/Recreación (rows 48-52, idx 47-51) ---
  for (let i = 0; i < 5; i++) {
    bind(47 + i, 20, `grupo.${i}.grupo`)
    bind(47 + i, 25, `grupo.${i}.literal`)
  }

  // --- Observaciones (row 53, idx 52) ---
  bind(52, 7, 'doc.observaciones')

  return config
}


export function createDefaultTemplate(): GridConfig {
  const totalCols = 27
  const columnWidths: string[] = [
    '1.58%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '1.73%',
    '1.58%',
    '0.25%',
    '1.58%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '4.5%',
    '1.73%',
    '1.58%',
  ]

  const rows: GridRow[] = []

  // Row 1
  {
    const c = emptyRow(totalCols)
    c.cells[12] = emptyCell({ content: 'CERTIFICACIÓN DE CALIFICACIONES  EMG', colspan: 15, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 2
  {
    const c = emptyRow(totalCols)
    c.cells[12] = emptyCell({ content: 'I. Plan de Estudio:  EDUCACIÓN MEDIA GENERAL', colspan: 10, fontWeight: 'bold', verticalAlign: 'center' })
    c.cells[22] = emptyCell({ content: 'Código 31059', colspan: 5, fontWeight: 'bold', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 3
  {
    const c = emptyRow(totalCols)
    c.cells[12] = emptyCell({ content: 'Lugar y Fecha de Expedición:', colspan: 7, fontWeight: 'bold', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 3, textAlign: 'right', verticalAlign: 'center', borderRight: false })
    c.cells[22] = emptyCell({ colspan: 5, verticalAlign: 'center', borderLeft: false })
    rows.push(c)
  }

  // Row 4 (empty)
  { const c = emptyRow(totalCols); rows.push(c) }
  // Remove borders for spacer row
  { const last = rows[rows.length - 1]; for (let i = 0; i < totalCols; i++) { last.cells[i].borderTop = false; last.cells[i].borderBottom = false; last.cells[i].borderLeft = false; last.cells[i].borderRight = false } }

  // Row 5
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'II. Datos de la Institución Educativa o  Centro de Desarrollo de la Calidad Educativa Estadal (CDCEE) que Emite la Certificación:', colspan: 27, fontWeight: 'bold', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 6
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Código:', colspan: 3, verticalAlign: 'center' })
    c.cells[3] = emptyCell({ content: 'OD16751520', colspan: 5, verticalAlign: 'center' })
    c.cells[8] = emptyCell({ content: 'Denominación y Epónimo:', colspan: 5, textAlign: 'center', verticalAlign: 'center', borderRight: false })
    c.cells[14] = emptyCell({ content: 'U E N CREACIÓN CÚA', colspan: 13, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 7
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Dirección:', colspan: 3, verticalAlign: 'center' })
    c.cells[3] = emptyCell({ content: 'Urb. José de S. Martín - Sector Los Bloques - Nueva Cúa', colspan: 15, verticalAlign: 'center' })
    c.cells[18] = emptyCell({ content: 'Teléfono:', colspan: 3, verticalAlign: 'center' })
    c.cells[21] = emptyCell({ content: '(0239) 7163530', colspan: 6, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 8
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Municipio:', colspan: 3, verticalAlign: 'center' })
    c.cells[3] = emptyCell({ content: 'Rafael Urdaneta', colspan: 4, textAlign: 'center', verticalAlign: 'center' })
    c.cells[7] = emptyCell({ content: 'Estado:', colspan: 3, verticalAlign: 'center' })
    c.cells[10] = emptyCell({ content: 'Miranda', colspan: 8, textAlign: 'center', verticalAlign: 'center' })
    c.cells[18] = emptyCell({ content: 'CDCEE:', colspan: 4, verticalAlign: 'center' })
    c.cells[22] = emptyCell({ content: 'Miranda', colspan: 5, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 9
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'III. Datos de Identificación del Estudiante:', colspan: 27, fontWeight: 'bold', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 10
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Cédula de Identidad:', colspan: 4, verticalAlign: 'center' })
    c.cells[4] = emptyCell({ content: 'V 27545879', colspan: 5, verticalAlign: 'center', bgColor: '#CCFFCC' })
    c.cells[9] = emptyCell({ content: 'Fecha de Nacimiento:', colspan: 6, verticalAlign: 'center' })
    c.cells[15] = emptyCell({ colspan: 12, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 11
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Apellidos:', colspan: 3, verticalAlign: 'center' })
    c.cells[3] = emptyCell({ verticalAlign: 'center', borderRight: false })
    c.cells[11] = emptyCell({ content: 'Nombres:', colspan: 4, verticalAlign: 'center' })
    c.cells[15] = emptyCell({ verticalAlign: 'center', borderRight: false })
    rows.push(c)
  }

  // Row 12
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Lugar de Nacimiento País:', colspan: 5, verticalAlign: 'center' })
    c.cells[5] = emptyCell({ verticalAlign: 'center', borderRight: false })
    c.cells[11] = emptyCell({ content: 'Estado:', colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    c.cells[13] = emptyCell({ verticalAlign: 'center', borderRight: false, borderLeft: false })
    c.cells[20] = emptyCell({ content: 'Municipio:', colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    c.cells[22] = emptyCell({ verticalAlign: 'center', borderRight: false })
    rows.push(c)
  }

  // Row 13
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'IV. Instituciones Educativas donde Cursó Estudios', colspan: 13, fontWeight: 'bold', verticalAlign: 'center', borderTop: false, borderRight: false, borderBottom: false })
    c.cells[14] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderLeft: false })
    c.cells[15] = emptyCell({ content: 'Denominación y Epónimo de la Institución Educativa', colspan: 6, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[21] = emptyCell({ content: 'Localidad', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ content: 'E.F.', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    rows.push(c)
  }

  // Row 14
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[1] = emptyCell({ content: 'Denominación y Epónimo de la Institución Educativa', colspan: 6, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[7] = emptyCell({ content: 'Localidad', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ content: 'E.F.', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: '3', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[15] = emptyCell({ colspan: 6, verticalAlign: 'center' })
    c.cells[21] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 15
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: '1', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[1] = emptyCell({ colspan: 6, verticalAlign: 'center' })
    c.cells[7] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: '4', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[15] = emptyCell({ colspan: 6, verticalAlign: 'center' })
    c.cells[21] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    rows.push(c)
  }

  // Row 16
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: '2', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[1] = emptyCell({ colspan: 6, verticalAlign: 'center' })
    c.cells[7] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[14] = emptyCell({ content: '5', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[15] = emptyCell({ colspan: 6, verticalAlign: 'center' })
    c.cells[21] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    rows.push(c)
  }

  // Row 17
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'V. Plan de Estudio:', colspan: 27, fontWeight: 'bold', verticalAlign: 'center', borderBottom: false })
    rows.push(c)
  }

  // Row 18
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'PRIMER AÑO', colspan: 13, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderRight: false })
    c.cells[14] = emptyCell({ content: 'SEGUNDO AÑO', colspan: 13, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderLeft: false })
    rows.push(c)
  }

  // Row 19
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'ÁREAS DE FORMACIÓN', colspan: 4, rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    c.cells[4] = emptyCell({ content: 'CALIFICACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[9] = emptyCell({ content: 'T-E', rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[10] = emptyCell({ content: 'FECHA', colspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ content: 'Inst. Educ.', rowspan: 2, fontSize: 7, fontWeight: 'bold', textAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'ÁREAS DE FORMACIÓN', colspan: 4, rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[18] = emptyCell({ content: 'CALIFICACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[23] = emptyCell({ content: 'T-E', rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ content: 'FECHA', colspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ content: 'Inst. Educ.', rowspan: 2, fontSize: 7, fontWeight: 'bold', textAlign: 'center' })
    rows.push(c)
  }

  // Row 20
  {
    const c = emptyRow(totalCols)
    c.cells[4] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[5] = emptyCell({ content: 'LETRAS', colspan: 4, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[10] = emptyCell({ content: 'Mes', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ content: 'Año', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[18] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: 'LETRAS', colspan: 4, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ content: 'Mes', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ content: 'Año', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 21
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Castellano', colspan: 4, verticalAlign: 'top', borderBottom: false })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Castellano', colspan: 4, verticalAlign: 'top', borderBottom: false })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 22
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Inglés y otras Lenguas Extranjeras', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Inglés y otras Lenguas Extranjeras', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 23
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Matemáticas', colspan: 4, verticalAlign: 'top', borderTop: false })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Matemáticas', colspan: 4, verticalAlign: 'top', borderTop: false })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 24
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Educación Física', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Educación Física', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 25
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Arte y Patrimonio', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Arte y Patrimonio', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 26
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Ciencias Naturales', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Ciencias Naturales', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 27
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Geografía, Historia y Ciudadanía', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[11] = emptyCell({ verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Geografía, Historia y Ciudadanía', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[25] = emptyCell({ verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 28
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'TERCER AÑO', colspan: 13, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderRight: false, borderBottom: false })
    c.cells[14] = emptyCell({ content: 'CUARTO AÑO', colspan: 13, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderBottom: false, borderLeft: false })
    rows.push(c)
  }

  // Row 29
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'ÁREAS DE FORMACIÓN', colspan: 4, rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[4] = emptyCell({ content: 'CALIFICACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ content: 'T-E', rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ content: 'FECHA', colspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[12] = emptyCell({ content: 'Inst. Educ.', rowspan: 2, fontSize: 7, fontWeight: 'bold', textAlign: 'center', borderBottom: false })
    c.cells[14] = emptyCell({ content: 'ÁREAS DE\nFORMACIÓN', colspan: 4, rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[18] = emptyCell({ content: 'CALIFICACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ content: 'T-E', rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ content: 'FECHA', colspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[26] = emptyCell({ content: 'Inst. Educ.', rowspan: 2, fontSize: 7, fontWeight: 'bold', textAlign: 'center', borderBottom: false })
    rows.push(c)
  }

  // Row 30
  {
    const c = emptyRow(totalCols)
    c.cells[4] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[5] = emptyCell({ content: 'LETRAS', colspan: 4, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderRight: false })
    c.cells[10] = emptyCell({ content: 'Mes', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[11] = emptyCell({ content: 'Año', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[18] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[19] = emptyCell({ content: 'LETRAS', colspan: 4, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderRight: false })
    c.cells[24] = emptyCell({ content: 'Mes', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[25] = emptyCell({ content: 'Año', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    rows.push(c)
  }

  // Row 31
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Castellano', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Castellano', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 32
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Inglés y otras Lenguas Extranjeras', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Inglés y otras Lenguas Extranjeras', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 33
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Matemáticas', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Matemáticas', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 34
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Educación Física', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Educación Física', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 35
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Física', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Física', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 36
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Química', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Química', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 37
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Biología', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Biología', colspan: 4, verticalAlign: 'top' })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 38
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Geografía, Historia y Ciudadanía', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Geografía, Historia y Ciudadanía', colspan: 4, verticalAlign: 'top', borderBottom: false })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 39
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: '**********************', colspan: 4, textAlign: 'center', verticalAlign: 'center' })
    c.cells[4] = emptyCell({ content: '****', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    c.cells[5] = emptyCell({ content: '**********************', colspan: 4, textAlign: 'center', verticalAlign: 'center' })
    c.cells[9] = emptyCell({ content: '****', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    c.cells[10] = emptyCell({ content: '****', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    c.cells[11] = emptyCell({ content: '****', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    c.cells[12] = emptyCell({ content: '****', textAlign: 'center', verticalAlign: 'center', borderTop: false })
    c.cells[14] = emptyCell({ content: 'Formación para la Soberanía Nacional', colspan: 4 })
    c.cells[18] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ colspan: 4, verticalAlign: 'center', borderRight: false })
    c.cells[23] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[24] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[25] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[26] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 40
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'QUINTO AÑO', colspan: 13, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderRight: false, borderBottom: false })
    c.cells[14] = emptyCell({ content: 'ÁREAS DE FORMACIÓN', colspan: 13, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderTop: false, borderBottom: false, borderLeft: false })
    rows.push(c)
  }

  // Row 41
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'ÁREAS DE FORMACIÓN', colspan: 4, rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[4] = emptyCell({ content: 'CALIFICACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderRight: false })
    c.cells[9] = emptyCell({ content: 'T-E', rowspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ content: 'FECHA', colspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[12] = emptyCell({ content: 'Inst. Educ.', rowspan: 2, fontSize: 7, fontWeight: 'bold', textAlign: 'center', borderBottom: false })
    c.cells[14] = emptyCell({ content: 'ÁREA DE FORMACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: 'AÑO', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[20] = emptyCell({ content: 'LITERAL', colspan: 7, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 42
  {
    const c = emptyRow(totalCols)
    c.cells[4] = emptyCell({ content: 'N°', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[5] = emptyCell({ content: 'LETRAS', colspan: 4, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderRight: false, borderBottom: false })
    c.cells[10] = emptyCell({ content: 'Mes', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[11] = emptyCell({ content: 'Año', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[14] = emptyCell({ content: 'Orientaciön y Convivencia', colspan: 5, rowspan: 5, textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '1°', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[20] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 43
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Castellano', colspan: 4, verticalAlign: 'top', borderBottom: false })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '2°', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[20] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 44
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Inglés y otras Lenguas Extranjeras', colspan: 4, verticalAlign: 'top' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '3°', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[20] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 45
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Matemáticas', colspan: 4, verticalAlign: 'center' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '4°', textAlign: 'center', verticalAlign: 'center', borderLeft: false })
    c.cells[20] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 46
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Educación Física', colspan: 4, verticalAlign: 'center' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '5°', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[20] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 47
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Física', colspan: 4, verticalAlign: 'center', borderBottom: false })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'AREA DE FORMACIÓN', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: 'AÑO', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false, borderLeft: false })
    c.cells[20] = emptyCell({ content: 'GRUPO', colspan: 5, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center', borderBottom: false })
    c.cells[25] = emptyCell({ content: 'LITERAL', colspan: 2, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 48
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Química', colspan: 4, verticalAlign: 'center' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Participaciónen Grupos de Creación, Recreación y Producción', colspan: 5, rowspan: 5, textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '1°', textAlign: 'center', verticalAlign: 'center' })
    c.cells[20] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[25] = emptyCell({ colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 49
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Biología', colspan: 4, verticalAlign: 'center' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '2°', textAlign: 'center', verticalAlign: 'center' })
    c.cells[20] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[25] = emptyCell({ colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 50
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Ciencias de la Tierra', colspan: 4, verticalAlign: 'center' })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '3°', textAlign: 'center', verticalAlign: 'center' })
    c.cells[20] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[25] = emptyCell({ colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 51
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Geografía, Historia y Ciudadanía', colspan: 4 })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '4°', textAlign: 'center', verticalAlign: 'center' })
    c.cells[20] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[25] = emptyCell({ colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 52
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Formación para la Soberanía Nacional', colspan: 4, borderBottom: false })
    c.cells[4] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[5] = emptyCell({ colspan: 4, verticalAlign: 'center' })
    c.cells[9] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[10] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[11] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[12] = emptyCell({ textAlign: 'center', verticalAlign: 'center' })
    c.cells[19] = emptyCell({ content: '5°', textAlign: 'center', verticalAlign: 'center' })
    c.cells[20] = emptyCell({ colspan: 5, verticalAlign: 'center' })
    c.cells[25] = emptyCell({ colspan: 2, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 53
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'VI. Observaciones:', colspan: 4, fontWeight: 'bold', verticalAlign: 'center', borderRight: false })
    c.cells[4] = emptyCell({ content: 'P.A.:', verticalAlign: 'center', borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })
    c.cells[5] = emptyCell({ colspan: 2, textAlign: 'center', verticalAlign: 'center', borderRight: false, borderLeft: false })
    c.cells[7] = emptyCell({ colspan: 20, verticalAlign: 'center', borderTop: false, borderLeft: false })
    rows.push(c)
  }

  // Row 54
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ colspan: 27, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 55
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ colspan: 27, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 56
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ colspan: 27, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 57
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'VII. Institución Educativa', colspan: 13, fontWeight: 'bold', borderTop: false })
    c.cells[14] = emptyCell({ content: 'VIII. Centro de Desarrollo de la Calidad Educativa Estadal', colspan: 13, fontWeight: 'bold', borderTop: false })
    rows.push(c)
  }

  // Row 58
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Director(a)', colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    c.cells[7] = emptyCell({ content: 'SELLO DE LA INSTITUCIÓN EDUCATIVA', colspan: 6, rowspan: 7, textAlign: 'center', verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Director(a)', colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    c.cells[21] = emptyCell({ content: 'SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL', colspan: 6, rowspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 59
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Apellidos y Nombres:', colspan: 7, verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Apellidos y Nombres:', colspan: 7, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 60
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 61
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Cédula de Identidad:', colspan: 7, verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Cédula de Identidad:', colspan: 7, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 62
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ colspan: 7, textAlign: 'center', verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 63
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Firma:', colspan: 7, verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Firma:', colspan: 7, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 64
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'Para efectos de su Validez Nacional', colspan: 7, verticalAlign: 'center' })
    c.cells[14] = emptyCell({ content: 'Para efectos de su Validez Internacional', colspan: 7, verticalAlign: 'center' })
    rows.push(c)
  }

  // Row 65
  {
    const c = emptyRow(totalCols)
    c.cells[0] = emptyCell({ content: 'VALOR FISCAL: Para su validez legal y de acuerdo al Ramo de Estampillas, al dorso de este documento se le debe colocar tres décimas de la Unidad Tributaria (0,3 U.T.)', colspan: 27, fontSize: 6, fontWeight: 'bold', verticalAlign: 'center', borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })
    rows.push(c)
  }

  return { totalCols, columnWidths, rows }
}