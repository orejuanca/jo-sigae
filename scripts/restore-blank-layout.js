const totalCols = 27
const columnWidths = [
  '1.58%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%',
  '1.73%','1.58%','0.25%','1.58%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%','4.5%',
  '1.73%','1.58%'
]

function emptyCell(overrides = {}) {
  return {
    content: '',
    dataBinding: null,
    fontSize: 9,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'middle',
    color: '#000000',
    bgColor: '',
    width: 'auto',
    height: 'auto',
    padding: '2px 4px',
    whiteSpace: 'normal',
    borderTop: true,
    borderRight: true,
    borderBottom: true,
    borderLeft: true,
    borderColor: '#000000',
    colspan: 1,
    rowspan: 1,
    ...overrides
  }
}

function emptyRow(cols) {
  const cells = {}
  for (let i = 0; i < cols; i++) cells[i] = emptyCell()
  return { cells }
}

// Build a blank grid - 40 rows, 27 cols, just empty cells with borders
const rows = []
for (let r = 0; r < 40; r++) {
  rows.push(emptyRow(totalCols))
}

const config = {
  rows,
  totalCols,
  columnWidths
}

fetch('https://jo-sigae.vercel.app/api/cert-layouts?plan=derogado', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'GRILLA EN BLANCO PLAN DEROGADO',
    datos: config,
    plan: 'derogado'
  })
})
.then(r => r.json())
.then(d => console.log('RESTAURADO:', JSON.stringify(d)))
.catch(e => console.error('ERROR:', e.message))