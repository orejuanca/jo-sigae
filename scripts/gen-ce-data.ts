import { writeFileSync } from 'fs'
import { join } from 'path'

const records = require(join(process.cwd(), 'db', 'ce_seed_data.json')) as { nombre: string; localidad: string; codigo: string; ef: string }[]

const lines: string[] = []
lines.push('export const CE_SEED_DATA: { nombre: string; localidad: string; codigo: string; ef: string }[] = [')
for (const r of records) {
  const nombre = r.nombre.replace(/'/g, "''").replace(/"/g, '\\"')
  const localidad = (r.localidad || '').replace(/'/g, "''").replace(/"/g, '\\"')
  const codigo = (r.codigo || '').replace(/'/g, "''").replace(/"/g, '\\"')
  const ef = (r.ef || '').replace(/'/g, "''").replace(/"/g, '\\"')
  lines.push(`  { nombre: '${nombre}', localidad: '${localidad}', codigo: '${codigo}', ef: '${ef}' },`)
}
lines.push(']')

writeFileSync(join(process.cwd(), 'src', 'lib', 'ce-seed-data.ts'), lines.join('\n'), 'utf-8')
console.log(`Generated ${records.length} records`)
