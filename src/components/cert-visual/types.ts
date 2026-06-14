export interface BlockProps {
  fontSize: number       // default 9
  rowHeight: number      // default 16
  borderWidth: number    // default 1
  paddingX: number       // default 2
  paddingY: number       // default 1
  headerBg: string       // default '#000000'
  headerColor: string    // default '#FFFFFF'
  showBorders: boolean   // default true
  separatorWidth: string // default '0.8%'
  marginTop: number      // default 0
  marginBottom: number   // default 0
}

export interface BlockConfig {
  id: string
  label: string
  props: BlockProps
}

export interface LayoutConfig {
  blocks: BlockConfig[]
  version: string
  updatedAt: string
}

export const AVAILABLE_BLOCKS = [
  { id: 'encabezado', label: 'Encabezado', icon: 'FileText' },
  { id: 'seccion2', label: 'II. Datos de la Institución', icon: 'Building2' },
  { id: 'seccion3', label: 'III. Datos del Estudiante', icon: 'User' },
  { id: 'seccion4', label: 'IV. Instituciones Educativas', icon: 'School' },
  { id: 'seccion5', label: 'V. Plan de Estudio', icon: 'BookOpen' },
  { id: 'seccion6', label: 'VI. Observaciones', icon: 'MessageSquare' },
  { id: 'seccion7', label: 'VII. Director', icon: 'Stamp' },
  { id: 'seccion8', label: 'VIII. CDCEE', icon: 'ShieldCheck' },
  { id: 'valorFiscal', label: 'Valor Fiscal', icon: 'DollarSign' },
]

export const DEFAULT_BLOCK_PROPS: BlockProps = {
  fontSize: 9, rowHeight: 16, borderWidth: 1, paddingX: 2, paddingY: 1,
  headerBg: '#000000', headerColor: '#FFFFFF', showBorders: true,
  separatorWidth: '0.8%', marginTop: 0, marginBottom: 0,
}

export const DEFAULT_BLOCK_ORDER = ['encabezado','seccion2','seccion3','seccion4','seccion5','seccion6','seccion7','seccion8','valorFiscal']

export function createDefaultLayout(): LayoutConfig {
  return {
    blocks: DEFAULT_BLOCK_ORDER.map(id => ({
      id, label: AVAILABLE_BLOCKS.find(b => b.id === id)?.label || id,
      props: { ...DEFAULT_BLOCK_PROPS },
    })),
    version: '1.0',
    updatedAt: new Date().toISOString(),
  }
}