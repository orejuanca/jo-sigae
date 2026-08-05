const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, 'src', 'app', 'certificaciones-visual', 'page.tsx')
if (!fs.existsSync(FILE)) {
  console.error('ERROR: No encuentro', FILE)
  process.exit(1)
}

let lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/)
console.log(`Archivo leido: ${lines.length} lineas`)

const scalesBlock = [
  '// === Escala automática por layout ===',
  'const LAYOUT_SCALES: Record<string, number> = {',
  "  'Ciclo Basico Comun OFICIAL': 89,",
  "  'EDUCACION MEDIA DIVER. Y PROF. OFICIAL': 89,",
  "  'EDUCACION MEDIA GENERAL DIVERSIF. OFICIAL': 89,",
  "  'III Etapa Educacion Basica OFICIAL': 89,",
  "  'EDUCACION MEDIA GENERAL BASICA OFICIAL': 89,",
  "  'CERTIFICACION EMG OFICIAL': 97,",
  '}',
  '',
]

const studentIdx = lines.findIndex(l => l.trim().startsWith('interface Student {'))
if (studentIdx === -1) { console.error('ERROR: No encontre interface Student'); process.exit(1) }
lines.splice(studentIdx, 0, ...scalesBlock)
console.log('[1] LAYOUT_SCALES insertado')

const dsIdx = lines.findIndex(l => l.includes('showPrintDialog') && l.includes('useState'))
if (dsIdx !== -1) { lines.splice(dsIdx, 1); console.log('[2] showPrintDialog state eliminado') }

const gcIdx = lines.findIndex(l => l.includes('setGridConfig(patchDataBindings(parsed))'))
if (gcIdx !== -1) {
  lines.splice(gcIdx + 1, 0,
    '        // Auto-apply scale by layout name',
    '        const autoScale = LAYOUT_SCALES[layout.nombre]',
    '        if (autoScale) { setPrintScale(autoScale) }'
  )
  console.log('[3] Auto-scale insertado')
}

const sdfIdx = lines.findIndex(l => l.trim() === 'setShowPrintDialog(false)')
if (sdfIdx !== -1) { lines.splice(sdfIdx, 1); console.log('[4] setShowPrintDialog(false) eliminado') }

const hpIdx = lines.findIndex(l => l.includes('handlePrint') && l.includes('setShowPrintDialog'))
if (hpIdx !== -1) { lines[hpIdx] = '  const handlePrint = () => executePrint(printScale)'; console.log('[5] handlePrint cambiado') }

const pdStart = lines.findIndex(l => l.includes('=== Print Dialog ==='))
if (pdStart !== -1) {
  let pdEnd = -1
  for (let i = pdStart; i < lines.length; i++) {
    if (lines[i].trim() === '</Dialog>') { pdEnd = i; break }
  }
  if (pdEnd !== -1) {
    lines.splice(pdStart, pdEnd - pdStart + 1)
    console.log(`[6] Print Dialog eliminado (${pdEnd - pdStart + 1} lineas)`)
  }
}

fs.writeFileSync(FILE, lines.join('\n'), 'utf8')
console.log(`\nListo! ${lines.length} lineas finales`)

