# Generates instalar-plan-derogado.cjs without backtick issues
import os

BT = "String.fromCharCode(96)"  # backtick char at runtime

route_ts = r"""import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const where: any = {}
    if (q.trim()) {
      where.OR = [
        { cedula: { contains: q.trim() } },
        { apellidos: { contains: q.trim(), mode: 'insensitive' } },
        { nombres: { contains: q.trim(), mode: 'insensitive' } },
      ]
    }

    const [records, total] = await Promise.all([
      prisma.planDerogado.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.planDerogado.count({ where }),
    ])

    return NextResponse.json({ data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error en GET /api/plan-derogado:', error)
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cedula, rawData } = body
    if (!cedula || !rawData) return NextResponse.json({ error: 'Cedula y rawData son requeridos' }, { status: 400 })
    const existing = await prisma.planDerogado.findUnique({ where: { cedula } })
    if (existing) return NextResponse.json({ error: 'Ya existe un registro con esa cedula' }, { status: 409 })
    const record = await prisma.planDerogado.create({ data: { cedula: cedula.trim(), rawData } })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/plan-derogado:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}
"""

id_route_ts = r"""import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Error en GET /api/plan-derogado/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener registro' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cedula, rawData, certDraft } = body
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    const updated = await prisma.planDerogado.update({
      where: { id },
      data: {
        ...(cedula !== undefined && { cedula: cedula.trim() }),
        ...(rawData !== undefined && { rawData }),
        ...(certDraft !== undefined && { certDraft }),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error en PUT /api/plan-derogado/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    await prisma.planDerogado.delete({ where: { id } })
    return NextResponse.json({ message: 'Registro eliminado' })
  } catch (error) {
    console.error('Error en DELETE /api/plan-derogado/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
"""

cert_data_route_ts = r"""import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata'

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

    let rawDataObj = {}
    try { rawDataObj = JSON.parse(record.rawData) } catch {
      return NextResponse.json({ error: 'rawData no es JSON valido' }, { status: 500 })
    }

    const studentLike = {
      apellidos: record.apellidos || String(rawDataObj['APELLIDOS'] || ''),
      nombres: record.nombres || String(rawDataObj['NOMBRES'] || ''),
      cedula: record.cedula,
      fechaNacimiento: record.fechaNacimiento || '',
      pais: record.pais || String(rawDataObj['PAIS'] || 'VENEZUELA'),
      estado: record.estado || String(rawDataObj['ESTADO'] || ''),
      municipio: record.municipio || String(rawDataObj['MUNICIPIO'] || ''),
    }

    const parsed = parseCertData(record.rawData, 'derogado')
    const certData = parsedToCertData(parsed, studentLike)
    return NextResponse.json(certData)
  } catch (error) {
    console.error('Error en GET /api/plan-derogado/[id]/cert-data:', error)
    return NextResponse.json({ error: 'Error al generar datos de certificacion' }, { status: 500 })
  }
}
"""

import_script = r"""const XLSX = require('xlsx')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const EXCEL_PATH = path.join(__dirname, '..', 'upload', 'Base de Datos plan derogado.xlsx')
console.log('=== Importacion Plan Derogado ===')
console.log('Excel:', EXCEL_PATH)

const fs = require('fs')
if (!fs.existsSync(EXCEL_PATH)) {
  console.error('ERROR: No se encontro el archivo Excel:', EXCEL_PATH)
  process.exit(1)
}

const prisma = new PrismaClient()
const wb = XLSX.readFile(EXCEL_PATH)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
const headers = rows[0]
console.log('Columnas:', headers.length)
console.log('Filas de datos:', rows.length - 1)

let insertados = 0, omitidos = 0, errores = 0

async function importar() {
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const cedula = String(row[0] || '').trim()
    if (!cedula) { omitidos++; continue }
    try {
      const rawDataObj = {}
      for (let c = 0; c < headers.length; c++) {
        const key = String(headers[c] || '').trim()
        if (key && c < row.length) rawDataObj[key] = String(row[c] ?? '')
      }
      const existing = await prisma.planDerogado.findUnique({ where: { cedula } })
      if (existing) { omitidos++; continue }
      await prisma.planDerogado.create({ data: { cedula, rawData: JSON.stringify(rawDataObj) } })
      insertados++
      if (insertados % 50 === 0) console.log('  Progreso:', insertados, 'insertados...')
    } catch (err) {
      console.error('  ERROR fila', i + 1, err.message)
      errores++
    }
  }
}

importar().then(() => {
  console.log('')
  console.log('Insertados:', insertados)
  console.log('Omitidos:', omitidos)
  console.log('Errores:', errores)
  console.log('=== Fin ===')
  prisma.$disconnect()
}).catch(err => {
  console.error('Error fatal:', err)
  prisma.$disconnect()
  process.exit(1)
})
"""

# Now generate the installer .cjs using JS string escaping
# For file contents, we'll use JSON.stringify which handles all escaping

import json

file_contents = {
    'src/app/api/plan-derogado/route.ts': route_ts,
    'src/app/api/plan-derogado/[id]/route.ts': id_route_ts,
    'src/app/api/plan-derogado/[id]/cert-data/route.ts': cert_data_route_ts,
    'scripts/update-plan-derogado.cjs': import_script,
}

# Build the installer script
installer_lines = []
installer_lines.append('// Auto-generated installer - no backticks in source')
installer_lines.append('const fs = require("fs")')
installer_lines.append('const path = require("path")')
installer_lines.append('const { execSync } = require("child_process")')
installer_lines.append('')
installer_lines.append('const BASE = __dirname')
installer_lines.append('const BT = String.fromCharCode(96)')
installer_lines.append('')
installer_lines.append('console.log("=====================================")')
installer_lines.append('console.log("  INSTALACION PLAN DEROGADO")')
installer_lines.append('console.log("=====================================")')
installer_lines.append('')
installer_lines.append('if (!fs.existsSync(path.join(BASE, "package.json"))) {')
installer_lines.append('  console.error("ERROR: Pon este archivo junto a package.json")')
installer_lines.append('  process.exit(1)')
installer_lines.append('}')
installer_lines.append('')
installer_lines.append('// PASO 1: CREAR ARCHIVOS')
installer_lines.append('console.log("PASO 1/3: Creando rutas API...")')

# Add each file as a JSON-stringified entry
for rel_path, content in file_contents.items():
    json_content = json.dumps(content, ensure_ascii=False)
    installer_lines.append(f'fs.mkdirSync(path.join(BASE, {json.dumps(path.dirname(rel_path))}), {{ recursive: true }})')
    installer_lines.append(f'fs.writeFileSync(path.join(BASE, {json.dumps(rel_path)}), {json_content}, "utf-8")')
    installer_lines.append(f'console.log("  OK {rel_path}")')

installer_lines.append('')
installer_lines.append('// PASO 2: PRISMA DB PUSH')
installer_lines.append('console.log("PASO 2/3: prisma db push...")')
installer_lines.append('try {')
installer_lines.append('  execSync("npx prisma db push --accept-data-loss 2>&1", { cwd: BASE, timeout: 120000, stdio: "pipe" })')
installer_lines.append('  console.log("  OK Tabla creada")')
installer_lines.append('} catch (err) {')
installer_lines.append('  console.log("  AVISO: Ejecuta manualmente: npx prisma db push")')
installer_lines.append('}')
installer_lines.append('')

# Dashboard changes - use BT variable for backticks
installer_lines.append('// PASO 3: 11 CAMBIOS AL DASHBOARD')
installer_lines.append('console.log("PASO 3/3: Aplicando 11 cambios a dashboard-content.tsx...")')
installer_lines.append('')
installer_lines.append('const DASH = path.join(BASE, "src", "components", "dashboard-content.tsx")')
installer_lines.append('if (!fs.existsSync(DASH)) { console.error("  ERROR: No encuentro dashboard-content.tsx"); process.exit(1) }')
installer_lines.append('')
installer_lines.append('const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)')
installer_lines.append('fs.copyFileSync(DASH, DASH + ".backup-" + ts)')
installer_lines.append('console.log("  Backup creado")')
installer_lines.append('')
installer_lines.append('let c = fs.readFileSync(DASH, "utf-8")')
installer_lines.append('')

# Cambios array
installer_lines.append('const cambios = [')

cambios = [
    ("Cambio 1: apiBase",
     "const apiBase = plan === 'vigente' ? '/api/plan-vigente' : '/api/students'",
     "const apiBase = plan === 'vigente' ? '/api/plan-vigente' : '/api/plan-derogado'",
     None),
    ("Cambio 2: search URL 1",
     None,  # will use BT
     None,
     None),
    ("Cambio 3: search URL 2",
     None,
     None,
     2),
    ("Cambio 4: fetch by ID 1",
     None,
     None,
     None),
    ("Cambio 5: fetch by ID 2",
     None,
     None,
     2),
    ("Cambio 6: cedula exact search",
     None,
     None,
     None),
    ("Cambio 7: postUrl",
     "const postUrl = plan === 'vigente' ? '/api/plan-vigente' : '/api/students'",
     "const postUrl = plan === 'vigente' ? '/api/plan-vigente' : '/api/plan-derogado'",
     None),
    ("Cambio 8: PUT URL",
     None,
     None,
     None),
    ("Cambio 9: DELETE URL",
     None,
     None,
     2),
    ("Cambio 10: isCeDropdown",
     "const isCeDropdown = plan === 'vigente' && ceList.length > 0 && c === 2 && r >= 14 && r <= 18",
     "const isCeDropdown = ceList.length > 0 && c === 2 && (\n    (plan === 'vigente' && r >= 14 && r <= 18) ||\n    (plan === 'derogado' && (r >= 14 && r <= 18 || r >= 20 && r <= 24))\n  )",
     None),
    ("Cambio 11: isAutoFill",
     "const isAutoFill = plan === 'vigente' && r >= 14 && r <= 18 && (c === 8 || c === 11)",
     "const isAutoFill = ceList.length > 0 && (c === 8 || c === 11) && (\n    (plan === 'vigente' && r >= 14 && r <= 18) ||\n    (plan === 'derogado' && (r >= 14 && r <= 18 || r >= 20 && r <= 24))\n  )",
     None),
]

for desc, old, new, count in cambios:
    installer_lines.append('  {')
    installer_lines.append(f'    desc: {json.dumps(desc)},')
    if old is not None:
        installer_lines.append(f'    old: {json.dumps(old)},')
    else:
        installer_lines.append('    old: ": " + BT + "/api/students?q=\${{encodeURIComponent(q.trim())}}&plan=\${{plan}}&limit=10" + BT,')
    installer_lines.append('  },')
    break  # just testing structure

# Actually, let me do this properly with all 11 cambios
print("Generating...")
print(f"Total installer lines so far: {len(installer_lines)}")
